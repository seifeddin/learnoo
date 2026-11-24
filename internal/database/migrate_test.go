package database_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/hadden-me/learnoo/internal/database"
	"github.com/hadden-me/learnoo/internal/database/dbtest"
	"github.com/hadden-me/learnoo/migrations"
)

func TestLoadRejectsBadNames(t *testing.T) {
	for name, fsys := range map[string]fstest.MapFS{
		"bad name":    {"init.sql": {Data: []byte("SELECT 1")}},
		"dup version": {"0001_a.sql": {Data: []byte("")}, "0001_b.sql": {Data: []byte("")}},
		"upper case":  {"0001_Init.sql": {Data: []byte("")}},
	} {
		if _, err := database.Load(fsys); err == nil {
			t.Errorf("%s: expected error", name)
		}
	}
}

func TestEmbeddedMigrationsLoad(t *testing.T) {
	migs, err := database.Load(migrations.FS)
	if err != nil {
		t.Fatal(err)
	}
	if len(migs) == 0 || migs[0].Version != "0001" {
		t.Fatalf("unexpected migrations: %+v", migs)
	}
}

func TestMigrateIsRepeatableAndChecked(t *testing.T) {
	ctx := context.Background()
	pool := dbtest.EmptySchema(t)

	if err := database.Check(ctx, pool, migrations.FS); !errors.Is(err, database.ErrPending) {
		t.Fatalf("fresh schema: want ErrPending, got %v", err)
	}
	applied, err := database.Migrate(ctx, pool, migrations.FS)
	if err != nil {
		t.Fatal(err)
	}
	if len(applied) == 0 {
		t.Fatal("first run applied nothing")
	}
	again, err := database.Migrate(ctx, pool, migrations.FS)
	if err != nil {
		t.Fatalf("second run: %v", err)
	}
	if len(again) != 0 {
		t.Fatalf("second run reapplied %v", again)
	}
	if err := database.Check(ctx, pool, migrations.FS); err != nil {
		t.Fatalf("check after migrate: %v", err)
	}
}

func TestMigrateDetectsEditedHistory(t *testing.T) {
	ctx := context.Background()
	pool := dbtest.EmptySchema(t)
	v1 := fstest.MapFS{"0001_a.sql": {Data: []byte("CREATE TABLE a (id int);")}}
	if _, err := database.Migrate(ctx, pool, v1); err != nil {
		t.Fatal(err)
	}
	edited := fstest.MapFS{"0001_a.sql": {Data: []byte("CREATE TABLE a (id bigint);")}}
	if err := database.Check(ctx, pool, edited); err == nil || !strings.Contains(err.Error(), "modified") {
		t.Fatalf("edited migration: want modified error, got %v", err)
	}
	if err := database.Check(ctx, pool, fstest.MapFS{}); err == nil || !strings.Contains(err.Error(), "does not know") {
		t.Fatalf("missing migration: want unknown error, got %v", err)
	}
	gap := fstest.MapFS{
		"0000_z.sql": {Data: []byte("SELECT 1;")},
		"0001_a.sql": v1["0001_a.sql"],
	}
	if err := database.Check(ctx, pool, gap); err == nil || !strings.Contains(err.Error(), "renumber") {
		t.Fatalf("out-of-order migration: want renumber error, got %v", err)
	}
}

func TestFailedMigrationRollsBack(t *testing.T) {
	ctx := context.Background()
	pool := dbtest.EmptySchema(t)
	bad := fstest.MapFS{"0001_bad.sql": {Data: []byte("CREATE TABLE ok_part (id int); SELECT broken syntax here;")}}
	if _, err := database.Migrate(ctx, pool, bad); err == nil {
		t.Fatal("expected failure")
	}
	var exists bool
	if err := pool.QueryRow(ctx, `SELECT to_regclass('ok_part') IS NOT NULL`).Scan(&exists); err != nil {
		t.Fatal(err)
	}
	if exists {
		t.Fatal("partial migration was not rolled back")
	}
}
