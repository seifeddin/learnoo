// Package auth implements password login, server-managed sessions, CSRF
// tokens and login throttling. It performs authentication only: permission
// checks arrive with the role model (see docs/DECISIONS.md).
package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"time"

	"github.com/hadden-me/learnoo/internal/users"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Config holds session and throttling policy.
type Config struct {
	// IdleTimeout ends a session after this long without requests.
	IdleTimeout time.Duration
	// AbsoluteTimeout ends a session this long after login regardless of use.
	AbsoluteTimeout time.Duration
	// ThrottleWindow is the sliding window for counting login attempts.
	ThrottleWindow time.Duration
	// AccountLimit is the number of attempts per email address per window.
	AccountLimit int
	// AddressLimit is the number of attempts per client address per window.
	AddressLimit int
	// Argon2 sets the cost of new hashes, including the dummy hash.
	Argon2 Argon2Params
}

// DefaultConfig is the production policy.
var DefaultConfig = Config{
	IdleTimeout:     24 * time.Hour,
	AbsoluteTimeout: 14 * 24 * time.Hour,
	ThrottleWindow:  15 * time.Minute,
	AccountLimit:    5,
	AddressLimit:    30,
	Argon2:          DefaultArgon2,
}

// touchInterval limits how often a session's idle expiry is extended.
const touchInterval = time.Minute

var (
	// ErrInvalidCredentials covers unknown email, wrong password and disabled
	// accounts alike so responses do not reveal which accounts exist.
	ErrInvalidCredentials = errors.New("invalid email or password")
	// ErrNoSession means the token is missing, unknown, expired or revoked.
	ErrNoSession = errors.New("no valid session")
)

// RateLimitedError is returned when an attempt exceeds a throttle limit.
type RateLimitedError struct{ RetryAfter time.Duration }

func (e *RateLimitedError) Error() string { return "too many login attempts" }

// Session is a live session joined with its user.
type Session struct {
	User              users.User
	CSRFToken         string
	CreatedAt         time.Time
	IdleExpiresAt     time.Time
	AbsoluteExpiresAt time.Time
}

// Service performs authentication against PostgreSQL.
type Service struct {
	db        *pgxpool.Pool
	cfg       Config
	now       func() time.Time
	dummyHash string
}

// New builds a Service. now may be nil to use the wall clock.
func New(db *pgxpool.Pool, cfg Config, now func() time.Time) (*Service, error) {
	if now == nil {
		now = time.Now
	}
	// A real hash of a random secret with the same cost, verified for unknown
	// accounts so their response time matches existing ones.
	dummy, err := HashPassword(randomToken(), cfg.Argon2)
	if err != nil {
		return nil, err
	}
	return &Service{db: db, cfg: cfg, now: now, dummyHash: dummy}, nil
}

// Login verifies credentials and, on success, creates a new session. Any
// session presented with the request (previousToken) is revoked, so the
// token always rotates at login. clientAddr identifies the network client for
// throttling. Returns the new cookie token.
func (s *Service) Login(ctx context.Context, email, password, clientAddr, previousToken string) (string, Session, error) {
	now := s.now().UTC()
	norm, err := users.NormalizeEmail(email)
	if err != nil {
		// Still throttle by address and spend hashing time.
		norm = "invalid:" + email
	}
	accountKey := throttleKey("account", norm)
	addressKey := throttleKey("address", clientAddr)

	attemptIDs, err := s.recordAttempt(ctx, now, accountKey, addressKey)
	if err != nil {
		return "", Session{}, err
	}

	u, hash, lookupErr := users.Credentials(ctx, s.db, norm)
	if lookupErr != nil && !errors.Is(lookupErr, users.ErrNotFound) {
		return "", Session{}, lookupErr
	}
	if lookupErr != nil || u.Disabled {
		hash = s.dummyHash
	}
	ok, verr := VerifyPassword(password, hash)
	if verr != nil {
		// A malformed stored hash is an operator problem; never a login.
		return "", Session{}, fmt.Errorf("verify password for user: %w", verr)
	}
	if !ok || lookupErr != nil || u.Disabled {
		return "", Session{}, ErrInvalidCredentials
	}

	token := randomToken()
	sess := Session{
		User:              u,
		CSRFToken:         randomToken(),
		CreatedAt:         now,
		IdleExpiresAt:     now.Add(s.cfg.IdleTimeout),
		AbsoluteExpiresAt: now.Add(s.cfg.AbsoluteTimeout),
	}
	if sess.IdleExpiresAt.After(sess.AbsoluteExpiresAt) {
		sess.IdleExpiresAt = sess.AbsoluteExpiresAt
	}
	err = pgx.BeginFunc(ctx, s.db, func(tx pgx.Tx) error {
		// Successful login clears this account's failures and this attempt's
		// address entry, so legitimate users are not penalised by their own success.
		if _, err := tx.Exec(ctx, `DELETE FROM login_attempts WHERE key_hash = $1 OR id = ANY($2)`, accountKey, attemptIDs); err != nil {
			return err
		}
		if previousToken != "" {
			if _, err := tx.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, hashToken(previousToken)); err != nil {
				return err
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM sessions WHERE user_id = $1 AND (idle_expires_at <= $2 OR absolute_expires_at <= $2)`, u.ID, now); err != nil {
			return err
		}
		_, err := tx.Exec(ctx,
			`INSERT INTO sessions (token_hash, user_id, csrf_token, created_at, last_seen_at, idle_expires_at, absolute_expires_at)
			 VALUES ($1, $2, $3, $4, $4, $5, $6)`,
			hashToken(token), u.ID, sess.CSRFToken, now, sess.IdleExpiresAt, sess.AbsoluteExpiresAt)
		return err
	})
	if err != nil {
		return "", Session{}, fmt.Errorf("create session: %w", err)
	}
	return token, sess, nil
}

// recordAttempt stores the attempt before checking limits, so concurrent
// requests each see the others and cannot all slip under the limit.
func (s *Service) recordAttempt(ctx context.Context, now time.Time, accountKey, addressKey []byte) ([]int64, error) {
	windowStart := now.Add(-s.cfg.ThrottleWindow)
	var ids []int64
	var limited *RateLimitedError
	err := pgx.BeginFunc(ctx, s.db, func(tx pgx.Tx) error {
		// Serialize attempts per key until commit; READ COMMITTED alone would
		// let concurrent transactions miss each other's uncommitted rows.
		// Locks are always taken account-then-address, so they cannot deadlock.
		for _, k := range [][]byte{accountKey, addressKey} {
			if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock($1)`, lockID(k)); err != nil {
				return err
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM login_attempts WHERE attempted_at <= $1`, windowStart); err != nil {
			return err
		}
		rows, err := tx.Query(ctx,
			`INSERT INTO login_attempts (key_hash, attempted_at) VALUES ($1, $3), ($2, $3) RETURNING id`,
			accountKey, addressKey, now)
		if err != nil {
			return err
		}
		ids, err = pgx.CollectRows(rows, pgx.RowTo[int64])
		if err != nil {
			return err
		}
		for _, k := range []struct {
			key   []byte
			limit int
		}{{accountKey, s.cfg.AccountLimit}, {addressKey, s.cfg.AddressLimit}} {
			var n int
			var oldest time.Time
			if err := tx.QueryRow(ctx,
				`SELECT count(*), min(attempted_at) FROM login_attempts WHERE key_hash = $1 AND attempted_at > $2`,
				k.key, windowStart).Scan(&n, &oldest); err != nil {
				return err
			}
			if n > k.limit {
				retry := oldest.Add(s.cfg.ThrottleWindow).Sub(now)
				if retry < time.Second {
					retry = time.Second
				}
				if limited == nil || retry > limited.RetryAfter {
					limited = &RateLimitedError{RetryAfter: retry}
				}
			}
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("record login attempt: %w", err)
	}
	if limited != nil {
		return nil, limited
	}
	return ids, nil
}

// Lookup returns the live session for a cookie token and extends its idle
// expiry (at most once per touchInterval, never past the absolute expiry).
func (s *Service) Lookup(ctx context.Context, token string) (Session, error) {
	if !validTokenFormat(token) {
		return Session{}, ErrNoSession
	}
	now := s.now().UTC()
	th := hashToken(token)
	var sess Session
	var lastSeen time.Time
	var disabledAt *time.Time
	err := s.db.QueryRow(ctx,
		`SELECT u.id, u.email, u.display_name, u.created_at, u.disabled_at,
		        s.csrf_token, s.created_at, s.last_seen_at, s.idle_expires_at, s.absolute_expires_at
		   FROM sessions s JOIN users u ON u.id = s.user_id
		  WHERE s.token_hash = $1 AND s.idle_expires_at > $2 AND s.absolute_expires_at > $2`,
		th, now).Scan(&sess.User.ID, &sess.User.Email, &sess.User.DisplayName, &sess.User.CreatedAt, &disabledAt,
		&sess.CSRFToken, &sess.CreatedAt, &lastSeen, &sess.IdleExpiresAt, &sess.AbsoluteExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Session{}, ErrNoSession
	}
	if err != nil {
		return Session{}, fmt.Errorf("load session: %w", err)
	}
	if disabledAt != nil {
		return Session{}, ErrNoSession
	}
	if now.Sub(lastSeen) >= touchInterval {
		idle := now.Add(s.cfg.IdleTimeout)
		if idle.After(sess.AbsoluteExpiresAt) {
			idle = sess.AbsoluteExpiresAt
		}
		if _, err := s.db.Exec(ctx,
			`UPDATE sessions SET last_seen_at = $2, idle_expires_at = $3 WHERE token_hash = $1`, th, now, idle); err != nil {
			return Session{}, fmt.Errorf("touch session: %w", err)
		}
		sess.IdleExpiresAt = idle
	}
	return sess, nil
}

// Logout revokes the session for token. Revoking an unknown token is not an error.
func (s *Service) Logout(ctx context.Context, token string) error {
	if !validTokenFormat(token) {
		return nil
	}
	if _, err := s.db.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, hashToken(token)); err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}
	return nil
}

// tokenBytes is the entropy of session and CSRF tokens.
const tokenBytes = 32

func randomToken() string {
	b := make([]byte, tokenBytes)
	if _, err := rand.Read(b); err != nil {
		panic("crypto/rand failed: " + err.Error())
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func validTokenFormat(token string) bool {
	if len(token) != base64.RawURLEncoding.EncodedLen(tokenBytes) {
		return false
	}
	_, err := base64.RawURLEncoding.DecodeString(token)
	return err == nil
}

func hashToken(token string) []byte {
	h := sha256.Sum256([]byte(token))
	return h[:]
}

func lockID(key []byte) int64 {
	return int64(binary.BigEndian.Uint64(key[:8]))
}

func throttleKey(scope, value string) []byte {
	h := sha256.Sum256([]byte("learnoo-login-throttle\x00" + scope + "\x00" + value))
	return h[:]
}
