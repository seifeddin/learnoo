// Package dbtest gives database-backed tests an isolated, migrated schema.
//
// Set LEARNOO_TEST_DATABASE_URL to a disposable PostgreSQL database. Without
// it the tests are skipped, unless LEARNOO_REQUIRE_DB_TESTS=1 (as in CI), in
// which case they fail so a misconfigured pipeline cannot pass silently.
package dbtest

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"os"
	"testing"

	"github.com/hadden-me/learnoo/internal/database"
	"github.com/hadden-me/learnoo/migrations"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// EnvURL names the variable holding the test database URL.
const EnvURL = "LEARNOO_TEST_DATABASE_URL"

// URL returns the test database URL or skips/fails the test.
func URL(t testing.TB) string {
	t.Helper()
	url := os.Getenv(EnvURL)
	if url == "" {
		if os.Getenv("LEARNOO_REQUIRE_DB_TESTS") == "1" {
			t.Fatalf("%s is not set but LEARNOO_REQUIRE_DB_TESTS=1", EnvURL)
		}
		t.Skipf("set %s to run database-backed tests", EnvURL)
	}
	return url
}

// EmptySchema returns a pool whose search_path is a fresh, empty schema that
// is dropped when the test ends. No migrations are applied.
func EmptySchema(t testing.TB) *pgxpool.Pool {
	t.Helper()
	url := URL(t)
	ctx := context.Background()
	var b [6]byte
	if _, err := rand.Read(b[:]); err != nil {
		t.Fatal(err)
	}
	schema := "test_" + hex.EncodeToString(b[:])

	admin, err := database.Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+pgx.Identifier{schema}.Sanitize()); err != nil {
		admin.Close()
		t.Fatal(err)
	}
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	cfg.MaxConns = 8
	pool, err := database.OpenConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		pool.Close()
		_, _ = admin.Exec(context.Background(), "DROP SCHEMA "+pgx.Identifier{schema}.Sanitize()+" CASCADE")
		admin.Close()
	})
	return pool
}

// Migrated returns an isolated schema with every migration applied.
func Migrated(t testing.TB) *pgxpool.Pool {
	t.Helper()
	pool := EmptySchema(t)
	if _, err := database.Migrate(context.Background(), pool, migrations.FS); err != nil {
		t.Fatal(err)
	}
	return pool
}
