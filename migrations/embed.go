// Package migrations embeds the ordered PostgreSQL schema migrations.
//
// Files are named NNNN_description.sql and applied in lexical order, each in
// its own transaction. Never edit a migration after it has been merged: the
// runner stores a checksum and refuses to start against a modified history.
package migrations

import "embed"

// FS holds every *.sql migration file.
//
//go:embed *.sql
var FS embed.FS
