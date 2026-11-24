// Package users stores accounts. It holds no roles or permissions: those
// wait for the recorded role-model decision (LRN-005 permission slice).
package users

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// User is an account without its password hash.
type User struct {
	ID          int64
	Email       string
	DisplayName string
	CreatedAt   time.Time
	Disabled    bool
}

var (
	ErrNotFound     = errors.New("user not found")
	ErrEmailTaken   = errors.New("email already registered")
	ErrInvalidEmail = errors.New("invalid email address")
	ErrInvalidName  = errors.New("display name must be 1-100 characters")
)

// MaxEmailLen follows the practical SMTP path limit.
const MaxEmailLen = 254

// NormalizeEmail trims and lower-cases an address; accounts are unique on
// this form. It returns ErrInvalidEmail for obviously invalid input.
func NormalizeEmail(email string) (string, error) {
	e := strings.ToLower(strings.TrimSpace(email))
	at := strings.IndexByte(e, '@')
	if e == "" || len(e) > MaxEmailLen || at < 1 || at == len(e)-1 || strings.Count(e, "@") != 1 ||
		strings.ContainsAny(e, " \t\r\n") || !utf8.ValidString(e) {
		return "", ErrInvalidEmail
	}
	return e, nil
}

// Create inserts an account with an already-computed password hash.
func Create(ctx context.Context, db *pgxpool.Pool, email, displayName, passwordHash string) (User, error) {
	e, err := NormalizeEmail(email)
	if err != nil {
		return User{}, err
	}
	name := strings.TrimSpace(displayName)
	if n := utf8.RuneCountInString(name); n < 1 || n > 100 {
		return User{}, ErrInvalidName
	}
	u := User{Email: e, DisplayName: name}
	err = db.QueryRow(ctx,
		`INSERT INTO users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id, created_at`,
		e, name, passwordHash).Scan(&u.ID, &u.CreatedAt)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return User{}, ErrEmailTaken
	}
	if err != nil {
		return User{}, fmt.Errorf("create user: %w", err)
	}
	return u, nil
}

// Credentials returns the user and password hash for a normalized email.
func Credentials(ctx context.Context, db *pgxpool.Pool, normalizedEmail string) (User, string, error) {
	var u User
	var hash string
	var disabledAt *time.Time
	err := db.QueryRow(ctx,
		`SELECT id, email, display_name, created_at, disabled_at, password_hash FROM users WHERE email = $1`,
		normalizedEmail).Scan(&u.ID, &u.Email, &u.DisplayName, &u.CreatedAt, &disabledAt, &hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, "", ErrNotFound
	}
	if err != nil {
		return User{}, "", fmt.Errorf("load user: %w", err)
	}
	u.Disabled = disabledAt != nil
	return u, hash, nil
}
