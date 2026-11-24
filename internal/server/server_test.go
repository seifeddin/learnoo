package server_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/hadden-me/learnoo/internal/auth"
	"github.com/hadden-me/learnoo/internal/database/dbtest"
	"github.com/hadden-me/learnoo/internal/server"
	"github.com/hadden-me/learnoo/internal/users"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Simulated users only; no real accounts or credentials.
const (
	testEmail    = "student.one@example.test"
	testPassword = "simulated-password-1"
)

type clock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *clock) Now() time.Time          { c.mu.Lock(); defer c.mu.Unlock(); return c.t }
func (c *clock) Advance(d time.Duration) { c.mu.Lock(); c.t = c.t.Add(d); c.mu.Unlock() }

type env struct {
	t     *testing.T
	db    *pgxpool.Pool
	h     http.Handler
	clock *clock
	cfg   auth.Config
}

// Cheap hashing keeps the suite fast; production parameters are covered by
// the password unit tests.
var testArgon2 = auth.Argon2Params{MemoryKiB: 1024, Iterations: 1, Lanes: 1, SaltLen: 16, KeyLen: 32}

func newEnv(t *testing.T) *env {
	t.Helper()
	db := dbtest.Migrated(t)
	cfg := auth.DefaultConfig
	cfg.Argon2 = testArgon2
	c := &clock{t: time.Date(2026, 11, 24, 9, 0, 0, 0, time.UTC)}
	svc, err := auth.New(db, cfg, c.Now)
	if err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	e := &env{t: t, db: db, h: server.New(db, svc, log), clock: c, cfg: cfg}
	e.createUser(testEmail, testPassword)
	return e
}

func (e *env) createUser(email, password string) users.User {
	e.t.Helper()
	hash, err := auth.HashPassword(password, testArgon2)
	if err != nil {
		e.t.Fatal(err)
	}
	u, err := users.Create(context.Background(), e.db, email, "Simulated Student", hash)
	if err != nil {
		e.t.Fatal(err)
	}
	return u
}

type reqOpt func(*http.Request)

func withCookie(token string) reqOpt {
	return func(r *http.Request) { r.AddCookie(&http.Cookie{Name: auth.CookieName, Value: token}) }
}
func withCSRF(tok string) reqOpt  { return func(r *http.Request) { r.Header.Set(auth.CSRFHeader, tok) } }
func withAddr(addr string) reqOpt { return func(r *http.Request) { r.RemoteAddr = addr + ":40000" } }
func withHeader(k, v string) reqOpt {
	return func(r *http.Request) { r.Header.Set(k, v) }
}

func (e *env) do(method, path string, body any, opts ...reqOpt) *httptest.ResponseRecorder {
	e.t.Helper()
	var rd io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	}
	r := httptest.NewRequest(method, "http://learnoo.test"+path, rd)
	if body != nil {
		r.Header.Set("Content-Type", "application/json")
	}
	r.RemoteAddr = "192.0.2.10:40000"
	for _, o := range opts {
		o(r)
	}
	w := httptest.NewRecorder()
	e.h.ServeHTTP(w, r)
	return w
}

func (e *env) login(email, password string, opts ...reqOpt) *httptest.ResponseRecorder {
	e.t.Helper()
	return e.do(http.MethodPost, "/api/auth/login", map[string]string{"email": email, "password": password}, opts...)
}

type sessionBody struct {
	User struct {
		ID          int64
		Email       string
		DisplayName string
	}
	CSRFToken string
}

// mustLogin returns the session cookie token and CSRF token.
func (e *env) mustLogin(opts ...reqOpt) (string, string) {
	e.t.Helper()
	w := e.login(testEmail, testPassword, opts...)
	if w.Code != http.StatusOK {
		e.t.Fatalf("login: %d %s", w.Code, w.Body)
	}
	var b sessionBody
	if err := json.Unmarshal(w.Body.Bytes(), &b); err != nil {
		e.t.Fatal(err)
	}
	return sessionCookie(e.t, w).Value, b.CSRFToken
}

func sessionCookie(t *testing.T, w *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()
	var found *http.Cookie
	for _, c := range w.Result().Cookies() {
		if c.Name == auth.CookieName {
			found = c // last one wins, as in browsers
		}
	}
	if found == nil {
		t.Fatalf("no %s cookie set", auth.CookieName)
	}
	return found
}

func errorCode(t *testing.T, w *httptest.ResponseRecorder) string {
	t.Helper()
	var b struct{ Error struct{ Code string } }
	if err := json.Unmarshal(w.Body.Bytes(), &b); err != nil {
		t.Fatalf("not a JSON error: %s", w.Body)
	}
	return b.Error.Code
}

func (e *env) sessionCount() int {
	var n int
	if err := e.db.QueryRow(context.Background(), `SELECT count(*) FROM sessions`).Scan(&n); err != nil {
		e.t.Fatal(err)
	}
	return n
}

func TestLoginSetsHardenedSessionCookie(t *testing.T) {
	e := newEnv(t)
	w := e.login("  Student.One@Example.TEST ", testPassword)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d %s", w.Code, w.Body)
	}
	c := sessionCookie(t, w)
	if !c.HttpOnly || !c.Secure || c.SameSite != http.SameSiteLaxMode || c.Path != "/" || c.Domain != "" {
		t.Fatalf("weak cookie attributes: %+v", c)
	}
	if len(c.Value) != 43 {
		t.Fatalf("unexpected token length %d", len(c.Value))
	}
	if got := w.Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("Cache-Control = %q", got)
	}
	var b sessionBody
	_ = json.Unmarshal(w.Body.Bytes(), &b)
	if b.User.Email != testEmail || b.CSRFToken == "" {
		t.Fatalf("unexpected body %s", w.Body)
	}
	if bytes.Contains(w.Body.Bytes(), []byte("argon2")) || bytes.Contains(w.Body.Bytes(), []byte(c.Value)) {
		t.Fatal("response leaks hash or session token")
	}
	// The database stores only a hash of the token.
	var n int
	_ = e.db.QueryRow(context.Background(), `SELECT count(*) FROM sessions WHERE token_hash = convert_to($1, 'UTF8')`, c.Value).Scan(&n)
	if n != 0 {
		t.Fatal("raw token stored in database")
	}
	w = e.do(http.MethodGet, "/api/auth/session", nil, withCookie(c.Value))
	if w.Code != http.StatusOK {
		t.Fatalf("session: %d %s", w.Code, w.Body)
	}
}

func TestInvalidCredentialsAreEnumerationSafe(t *testing.T) {
	e := newEnv(t)
	disabled := e.createUser("disabled@example.test", testPassword)
	if _, err := e.db.Exec(context.Background(), `UPDATE users SET disabled_at = now() WHERE id = $1`, disabled.ID); err != nil {
		t.Fatal(err)
	}
	cases := []struct{ name, email, password string }{
		{"wrong password", testEmail, "wrong-password-123"},
		{"unknown email", "nobody@example.test", testPassword},
		{"disabled account", "disabled@example.test", testPassword},
		{"malformed email", "not-an-email", testPassword},
	}
	var first []byte
	for i, c := range cases {
		w := e.login(c.email, c.password, withAddr("198.51.100."+strconv.Itoa(i+1)))
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("%s: got %d %s", c.name, w.Code, w.Body)
		}
		if len(w.Result().Cookies()) != 0 {
			t.Fatalf("%s: failed login set a cookie", c.name)
		}
		if first == nil {
			first = w.Body.Bytes()
		} else if !bytes.Equal(first, w.Body.Bytes()) {
			t.Fatalf("%s: body %q differs from %q", c.name, w.Body, first)
		}
	}
	if e.sessionCount() != 0 {
		t.Fatal("failed logins created sessions")
	}
}

// Login request keys must match exactly and appear once: encoding/json alone
// would fold "EMAIL" or "ſ"-spelled keys onto fields and keep the last duplicate.
func TestLoginRejectsAmbiguousJSON(t *testing.T) {
	e := newEnv(t)
	post := func(body string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodPost, "http://learnoo.test/api/auth/login", strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
		r.RemoteAddr = "192.0.2.10:40000"
		w := httptest.NewRecorder()
		e.h.ServeHTTP(w, r)
		return w
	}
	creds := `"email":"` + testEmail + `","password":"` + testPassword + `"`
	for name, body := range map[string]string{
		"upper-case key":     `{"EMAIL":"` + testEmail + `","password":"` + testPassword + `"}`,
		"title-case key":     `{"email":"` + testEmail + `","Password":"` + testPassword + `"}`,
		"long-s-folded key":  `{"email":"` + testEmail + `","pasſword":"` + testPassword + `"}`,
		"duplicate email":    `{"email":"nobody@example.test",` + creds + `}`,
		"duplicate password": `{` + creds + `,"password":"wrong-password-123"}`,
		"trailing brace":     `{` + creds + `}}`,
		"trailing bracket":   `{` + creds + `}]`,
		"second value":       `{` + creds + `} {}`,
		"unknown field":      `{` + creds + `,"remember":true}`,
	} {
		w := post(body)
		if w.Code != http.StatusBadRequest || errorCode(t, w) != "invalid_request" {
			t.Fatalf("%s: got %d %s", name, w.Code, w.Body)
		}
		if len(w.Result().Cookies()) != 0 {
			t.Fatalf("%s: rejected login set a cookie", name)
		}
	}
	if e.sessionCount() != 0 {
		t.Fatal("rejected logins created sessions")
	}
	// Rejected bodies never reach the service, so they are not sign-in
	// attempts: more than the 5-per-email limit were sent above.
	var attempts int
	if err := e.db.QueryRow(context.Background(), `SELECT count(*) FROM login_attempts`).Scan(&attempts); err != nil {
		t.Fatal(err)
	}
	if attempts != 0 {
		t.Fatalf("rejected logins recorded %d attempts", attempts)
	}
	if w := post("{" + creds + "}\n"); w.Code != http.StatusOK {
		t.Fatalf("exact request with trailing newline: %d %s", w.Code, w.Body)
	}
}

func TestAnonymousAccessIsRejected(t *testing.T) {
	e := newEnv(t)
	w := e.do(http.MethodGet, "/api/auth/session", nil)
	if w.Code != http.StatusUnauthorized || errorCode(t, w) != "unauthenticated" {
		t.Fatalf("anonymous session: %d %s", w.Code, w.Body)
	}
	w = e.do(http.MethodPost, "/api/auth/logout", nil, withCSRF("anything"))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous logout: %d %s", w.Code, w.Body)
	}
	// A forged or unknown cookie is treated as anonymous and cleared.
	forged := "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
	w = e.do(http.MethodGet, "/api/auth/session", nil, withCookie(forged))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("forged cookie: %d", w.Code)
	}
	if c := sessionCookie(t, w); c.MaxAge >= 0 || c.Value != "" {
		t.Fatalf("forged cookie not cleared: %+v", c)
	}
}

func TestSessionIdleAndAbsoluteExpiry(t *testing.T) {
	e := newEnv(t)

	// Idle expiry.
	token, _ := e.mustLogin()
	e.clock.Advance(e.cfg.IdleTimeout - time.Second)
	if w := e.do(http.MethodGet, "/api/auth/session", nil, withCookie(token)); w.Code != http.StatusOK {
		t.Fatalf("before idle expiry: %d", w.Code)
	}
	e.clock.Advance(e.cfg.IdleTimeout + time.Second) // no activity since the last request
	if w := e.do(http.MethodGet, "/api/auth/session", nil, withCookie(token)); w.Code != http.StatusUnauthorized {
		t.Fatalf("after idle expiry: %d", w.Code)
	}

	// Activity extends the idle expiry but never past the absolute expiry.
	token, _ = e.mustLogin(withAddr("198.51.100.20"))
	start := e.clock.Now()
	for e.clock.Now().Sub(start) < e.cfg.AbsoluteTimeout-e.cfg.IdleTimeout/2 {
		e.clock.Advance(e.cfg.IdleTimeout / 2)
		if w := e.do(http.MethodGet, "/api/auth/session", nil, withCookie(token)); w.Code != http.StatusOK {
			t.Fatalf("active session expired early at %v: %d", e.clock.Now().Sub(start), w.Code)
		}
	}
	e.clock.Advance(e.cfg.IdleTimeout / 2)
	if w := e.do(http.MethodGet, "/api/auth/session", nil, withCookie(token)); w.Code != http.StatusUnauthorized {
		t.Fatalf("session outlived absolute expiry: %d", w.Code)
	}
}

func TestLoginRotatesSession(t *testing.T) {
	e := newEnv(t)
	old, _ := e.mustLogin()
	fresh, _ := e.mustLogin(withCookie(old))
	if fresh == old {
		t.Fatal("login reused the presented session token")
	}
	if w := e.do(http.MethodGet, "/api/auth/session", nil, withCookie(old)); w.Code != http.StatusUnauthorized {
		t.Fatalf("pre-login session still valid: %d", w.Code)
	}
	if w := e.do(http.MethodGet, "/api/auth/session", nil, withCookie(fresh)); w.Code != http.StatusOK {
		t.Fatalf("new session invalid: %d", w.Code)
	}
	if e.sessionCount() != 1 {
		t.Fatalf("want 1 session after rotation, got %d", e.sessionCount())
	}
	// Session fixation: an attacker-chosen cookie value is never adopted.
	planted := "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
	if issued, _ := e.mustLogin(withCookie(planted)); issued == planted {
		t.Fatal("server adopted a client-chosen session token")
	}
}

func TestLogoutRevokesSession(t *testing.T) {
	e := newEnv(t)
	token, csrf := e.mustLogin()
	other, _ := e.mustLogin(withAddr("198.51.100.30")) // second device
	w := e.do(http.MethodPost, "/api/auth/logout", nil, withCookie(token), withCSRF(csrf))
	if w.Code != http.StatusNoContent {
		t.Fatalf("logout: %d %s", w.Code, w.Body)
	}
	if c := sessionCookie(t, w); c.MaxAge >= 0 {
		t.Fatalf("logout did not clear cookie: %+v", c)
	}
	// Replaying the old cookie fails: the session is revoked server-side.
	if w := e.do(http.MethodGet, "/api/auth/session", nil, withCookie(token)); w.Code != http.StatusUnauthorized {
		t.Fatalf("revoked session accepted: %d", w.Code)
	}
	if w := e.do(http.MethodGet, "/api/auth/session", nil, withCookie(other)); w.Code != http.StatusOK {
		t.Fatalf("logout revoked an unrelated session: %d", w.Code)
	}
}

func TestCSRFRejection(t *testing.T) {
	e := newEnv(t)
	token, csrf := e.mustLogin()
	_, otherCSRF := e.mustLogin(withAddr("198.51.100.40"))

	for name, opts := range map[string][]reqOpt{
		"missing token":         {withCookie(token)},
		"other session's token": {withCookie(token), withCSRF(otherCSRF)},
		"garbage token":         {withCookie(token), withCSRF("x")},
	} {
		w := e.do(http.MethodPost, "/api/auth/logout", nil, opts...)
		if w.Code != http.StatusForbidden || errorCode(t, w) != "csrf_rejected" {
			t.Fatalf("%s: %d %s", name, w.Code, w.Body)
		}
	}
	// Valid token but cross-site origin: rejected before reaching the handler.
	for name, opt := range map[string]reqOpt{
		"Sec-Fetch-Site": withHeader("Sec-Fetch-Site", "cross-site"),
		"Origin":         withHeader("Origin", "https://evil.example"),
	} {
		w := e.do(http.MethodPost, "/api/auth/logout", nil, withCookie(token), withCSRF(csrf), opt)
		if w.Code != http.StatusForbidden || errorCode(t, w) != "cross_origin_rejected" {
			t.Fatalf("cross-origin logout via %s: %d %s", name, w.Code, w.Body)
		}
	}
	if w := e.do(http.MethodGet, "/api/auth/session", nil, withCookie(token)); w.Code != http.StatusOK {
		t.Fatalf("rejected requests must not revoke the session: %d", w.Code)
	}
	// Login CSRF: a cross-site page cannot sign the victim in to another account.
	w := e.login(testEmail, testPassword, withHeader("Sec-Fetch-Site", "cross-site"))
	if w.Code != http.StatusForbidden {
		t.Fatalf("cross-site login: %d", w.Code)
	}
	// HTML forms cannot send JSON without a CORS preflight; reject other types.
	r := httptest.NewRequest(http.MethodPost, "http://learnoo.test/api/auth/login",
		bytes.NewBufferString("email=a%40b.test&password=x"))
	r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rw := httptest.NewRecorder()
	e.h.ServeHTTP(rw, r)
	if rw.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("form-encoded login: %d", rw.Code)
	}
	// Same-origin browser requests are allowed.
	w = e.do(http.MethodPost, "/api/auth/logout", nil, withCookie(token), withCSRF(csrf),
		withHeader("Sec-Fetch-Site", "same-origin"), withHeader("Origin", "http://learnoo.test"))
	if w.Code != http.StatusNoContent {
		t.Fatalf("same-origin logout: %d %s", w.Code, w.Body)
	}
}

func TestLoginRateLimitPerAccount(t *testing.T) {
	e := newEnv(t)
	for i := 0; i < e.cfg.AccountLimit; i++ {
		// Rotate addresses so only the account limit applies.
		w := e.login(testEmail, "wrong-password-123", withAddr("203.0.113."+strconv.Itoa(i+1)))
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d: %d", i+1, w.Code)
		}
	}
	// Even the correct password is refused while limited.
	w := e.login(testEmail, testPassword, withAddr("203.0.113.99"))
	if w.Code != http.StatusTooManyRequests || errorCode(t, w) != "rate_limited" {
		t.Fatalf("over limit: %d %s", w.Code, w.Body)
	}
	if ra, err := strconv.Atoi(w.Header().Get("Retry-After")); err != nil || ra <= 0 || ra > int(e.cfg.ThrottleWindow.Seconds()) {
		t.Fatalf("bad Retry-After %q", w.Header().Get("Retry-After"))
	}
	if e.sessionCount() != 0 {
		t.Fatal("limited login created a session")
	}
	// Unknown accounts are limited the same way (no enumeration via 429).
	for i := 0; i <= e.cfg.AccountLimit; i++ {
		w = e.login("ghost@example.test", "wrong-password-123", withAddr("203.0.114."+strconv.Itoa(i+1)))
	}
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("unknown account not limited: %d", w.Code)
	}
	// Recovery after the window.
	e.clock.Advance(e.cfg.ThrottleWindow + time.Second)
	if w := e.login(testEmail, testPassword, withAddr("203.0.113.99")); w.Code != http.StatusOK {
		t.Fatalf("after window: %d %s", w.Code, w.Body)
	}
}

func TestSuccessfulLoginResetsAccountFailures(t *testing.T) {
	e := newEnv(t)
	for round := 0; round < 3; round++ {
		for i := 0; i < e.cfg.AccountLimit-1; i++ {
			if w := e.login(testEmail, "wrong-password-123"); w.Code != http.StatusUnauthorized {
				t.Fatalf("round %d attempt %d: %d", round, i, w.Code)
			}
		}
		if w := e.login(testEmail, testPassword); w.Code != http.StatusOK {
			t.Fatalf("round %d: legitimate login refused: %d", round, w.Code)
		}
	}
}

func TestLoginRateLimitPerAddress(t *testing.T) {
	e := newEnv(t)
	for i := 0; i < e.cfg.AddressLimit; i++ {
		w := e.login("user"+strconv.Itoa(i)+"@example.test", "wrong-password-123", withAddr("203.0.113.7"))
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d: %d", i+1, w.Code)
		}
	}
	if w := e.login(testEmail, testPassword, withAddr("203.0.113.7")); w.Code != http.StatusTooManyRequests {
		t.Fatalf("address over limit: %d", w.Code)
	}
	if w := e.login(testEmail, testPassword, withAddr("203.0.113.8")); w.Code != http.StatusOK {
		t.Fatalf("other address affected: %d", w.Code)
	}
}

func TestConcurrentAttemptsCannotExceedLimit(t *testing.T) {
	e := newEnv(t)
	const n = 20
	codes := make(chan int, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			codes <- e.login(testEmail, "wrong-password-123", withAddr("203.0.115."+strconv.Itoa(i+1))).Code
		}(i)
	}
	wg.Wait()
	close(codes)
	unauthorized := 0
	for c := range codes {
		switch c {
		case http.StatusUnauthorized:
			unauthorized++
		case http.StatusTooManyRequests:
		default:
			t.Fatalf("unexpected status %d", c)
		}
	}
	if unauthorized > e.cfg.AccountLimit {
		t.Fatalf("%d password checks ran; limit is %d", unauthorized, e.cfg.AccountLimit)
	}
}

func TestHealthAndUnknownRoutes(t *testing.T) {
	e := newEnv(t)
	if w := e.do(http.MethodGet, "/healthz", nil); w.Code != http.StatusOK {
		t.Fatalf("healthz: %d", w.Code)
	}
	if w := e.do(http.MethodGet, "/nope", nil); w.Code != http.StatusNotFound {
		t.Fatalf("unknown route: %d", w.Code)
	}
}
