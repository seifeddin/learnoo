package main

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"strings"
	"testing"

	"github.com/hadden-me/learnoo/internal/database/dbtest"
)

func TestRequireLoopback(t *testing.T) {
	for addr, ok := range map[string]bool{
		"127.0.0.1:8090": true,
		"[::1]:8090":     true,
		"localhost:8090": true,
		"0.0.0.0:8090":   false,
		":8090":          false,
		"192.0.2.1:8090": false,
		"example.test:1": false,
	} {
		if err := requireLoopback(addr); (err == nil) != ok {
			t.Errorf("%s: err=%v, want ok=%v", addr, err, ok)
		}
	}
}

func TestCreateUserValidatesBeforeTouchingDatabase(t *testing.T) {
	t.Setenv("LEARNOO_DATABASE_URL", "")
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	for name, tc := range map[string]struct {
		args  []string
		stdin string
		want  string
	}{
		"missing flags":  {[]string{"create-user"}, "long-enough-password\n", "needs -email and -name"},
		"short password": {[]string{"create-user", "-email", "a@example.test", "-name", "A"}, "short\n", "at least 12"},
	} {
		err := run(tc.args, strings.NewReader(tc.stdin), io.Discard, log)
		if err == nil || !strings.Contains(err.Error(), tc.want) {
			t.Errorf("%s: got %v, want %q", name, err, tc.want)
		}
	}
}

func TestMigrateAndCreateUserCommands(t *testing.T) {
	// The command opens its own pool, so run it against a fresh schema via search_path.
	pool := dbtest.EmptySchema(t)
	var schema string
	if err := pool.QueryRow(context.Background(), `SELECT current_schema()`).Scan(&schema); err != nil {
		t.Fatal(err)
	}
	url := dbtest.URL(t)
	sep := "?"
	if strings.Contains(url, "?") {
		sep = "&"
	}
	t.Setenv("LEARNOO_DATABASE_URL", url+sep+"search_path="+schema)
	log := slog.New(slog.NewTextHandler(io.Discard, nil))

	var out bytes.Buffer
	if err := run([]string{"migrate", "-check"}, nil, &out, log); err == nil {
		t.Fatal("check on empty schema should fail")
	}
	if err := run([]string{"migrate"}, nil, &out, log); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), "applied 0001_identity.sql") {
		t.Fatalf("output: %s", out.String())
	}
	out.Reset()
	if err := run([]string{"migrate"}, nil, &out, log); err != nil || !strings.Contains(out.String(), "up to date") {
		t.Fatalf("repeat migrate: %v %s", err, out.String())
	}
	if err := run([]string{"migrate", "-check"}, nil, &out, log); err != nil {
		t.Fatal(err)
	}
	args := []string{"create-user", "-email", "Teacher@Example.test", "-name", "Simulated Teacher"}
	if err := run(args, strings.NewReader("simulated-password-2\n"), &out, log); err != nil {
		t.Fatal(err)
	}
	if err := run(args, strings.NewReader("simulated-password-2\n"), &out, log); err == nil || !strings.Contains(err.Error(), "already registered") {
		t.Fatalf("duplicate: %v", err)
	}
	var hash string
	if err := pool.QueryRow(context.Background(), `SELECT password_hash FROM users WHERE email = 'teacher@example.test'`).Scan(&hash); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(hash, "$argon2id$") || strings.Contains(hash, "simulated-password-2") {
		t.Fatalf("unexpected stored hash %q", hash)
	}
}
