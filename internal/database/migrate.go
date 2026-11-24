// Package database opens the PostgreSQL pool and applies schema migrations.
package database

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"regexp"
	"sort"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// migrationLockKey serializes concurrent migration runs (pg_advisory_lock).
const migrationLockKey int64 = 0x6c726e6f6f5f6d67 // "lrnoo_mg"

var migrationName = regexp.MustCompile(`^(\d{4})_[a-z0-9_]+\.sql$`)

// Migration is one embedded schema file.
type Migration struct {
	Version  string
	Name     string
	SQL      string
	Checksum string
}

// ErrPending reports that the database is behind the embedded migrations.
var ErrPending = errors.New("database has pending migrations")

// Load reads and orders migration files from fsys.
func Load(fsys fs.FS) ([]Migration, error) {
	entries, err := fs.ReadDir(fsys, ".")
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}
	var out []Migration
	seen := map[string]string{}
	for _, e := range entries {
		if e.IsDir() || !isSQL(e.Name()) {
			continue
		}
		m := migrationName.FindStringSubmatch(e.Name())
		if m == nil {
			return nil, fmt.Errorf("migration %q: name must match NNNN_description.sql", e.Name())
		}
		if prev, ok := seen[m[1]]; ok {
			return nil, fmt.Errorf("migrations %q and %q share version %s", prev, e.Name(), m[1])
		}
		seen[m[1]] = e.Name()
		body, err := fs.ReadFile(fsys, e.Name())
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", e.Name(), err)
		}
		sum := sha256.Sum256(body)
		out = append(out, Migration{Version: m[1], Name: e.Name(), SQL: string(body), Checksum: hex.EncodeToString(sum[:])})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Version < out[j].Version })
	return out, nil
}

func isSQL(name string) bool { return len(name) > 4 && name[len(name)-4:] == ".sql" }

// Status compares the database history with the embedded migrations. It
// returns the migrations not yet applied, or an error when the applied
// history diverges (unknown version or changed checksum).
func Status(ctx context.Context, pool *pgxpool.Pool, fsys fs.FS) ([]Migration, error) {
	migs, err := Load(fsys)
	if err != nil {
		return nil, err
	}
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Release()
	if err := ensureTable(ctx, conn.Conn()); err != nil {
		return nil, err
	}
	return pending(ctx, conn.Conn(), migs)
}

// Check returns nil only when every embedded migration is applied unchanged.
func Check(ctx context.Context, pool *pgxpool.Pool, fsys fs.FS) error {
	p, err := Status(ctx, pool, fsys)
	if err != nil {
		return err
	}
	if len(p) > 0 {
		return fmt.Errorf("%w: next is %s", ErrPending, p[0].Name)
	}
	return nil
}

// Migrate applies pending migrations in order, each in its own transaction,
// holding an advisory lock so concurrent runs cannot interleave. It is safe
// to run repeatedly. It returns the names of the migrations it applied.
func Migrate(ctx context.Context, pool *pgxpool.Pool, fsys fs.FS) ([]string, error) {
	migs, err := Load(fsys)
	if err != nil {
		return nil, err
	}
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Release()
	c := conn.Conn()
	if _, err := c.Exec(ctx, `SELECT pg_advisory_lock($1)`, migrationLockKey); err != nil {
		return nil, fmt.Errorf("acquire migration lock: %w", err)
	}
	defer func() {
		// Use a fresh context so the lock is released even if ctx was cancelled.
		_, _ = c.Exec(context.Background(), `SELECT pg_advisory_unlock($1)`, migrationLockKey)
	}()
	if err := ensureTable(ctx, c); err != nil {
		return nil, err
	}
	todo, err := pending(ctx, c, migs)
	if err != nil {
		return nil, err
	}
	var applied []string
	for _, m := range todo {
		err := pgx.BeginFunc(ctx, c, func(tx pgx.Tx) error {
			if _, err := tx.Exec(ctx, m.SQL); err != nil {
				return err
			}
			_, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)`, m.Version, m.Name, m.Checksum)
			return err
		})
		if err != nil {
			return applied, fmt.Errorf("apply %s: %w", m.Name, err)
		}
		applied = append(applied, m.Name)
	}
	return applied, nil
}

func ensureTable(ctx context.Context, c *pgx.Conn) error {
	_, err := c.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version    text PRIMARY KEY,
		name       text NOT NULL,
		checksum   text NOT NULL,
		applied_at timestamptz NOT NULL DEFAULT now()
	)`)
	if err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}
	return nil
}

func pending(ctx context.Context, c *pgx.Conn, migs []Migration) ([]Migration, error) {
	rows, err := c.Query(ctx, `SELECT version, name, checksum FROM schema_migrations ORDER BY version`)
	if err != nil {
		return nil, fmt.Errorf("read schema_migrations: %w", err)
	}
	type row struct{ name, checksum string }
	applied := map[string]row{}
	for rows.Next() {
		var v string
		var r row
		if err := rows.Scan(&v, &r.name, &r.checksum); err != nil {
			rows.Close()
			return nil, err
		}
		applied[v] = r
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	known := map[string]bool{}
	var todo []Migration
	for _, m := range migs {
		known[m.Version] = true
		r, ok := applied[m.Version]
		if !ok {
			todo = append(todo, m)
			continue
		}
		if r.checksum != m.Checksum || r.name != m.Name {
			return nil, fmt.Errorf("migration %s was modified after being applied (recorded %s); never edit a merged migration", m.Name, r.name)
		}
		if len(todo) > 0 {
			return nil, fmt.Errorf("migration %s is applied but earlier %s is not; renumber the new migration", m.Name, todo[0].Name)
		}
	}
	for v, r := range applied {
		if !known[v] {
			return nil, fmt.Errorf("database has migration %s (%s) that this build does not know", v, r.name)
		}
	}
	return todo, nil
}
