package auth

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"math"
	"mime"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/hadden-me/learnoo/internal/strictjson"
)

// CookieName uses the __Host- prefix: browsers only accept it with Secure,
// Path=/ and no Domain, so subdomains cannot set or overwrite it.
const CookieName = "__Host-learnoo_session"

// CSRFHeader carries the session's CSRF token on authenticated mutations.
const CSRFHeader = "X-CSRF-Token"

const maxLoginBody = 4 << 10

type ctxKey struct{}

// SessionFrom returns the authenticated session attached by Middleware.
func SessionFrom(ctx context.Context) (Session, bool) {
	s, ok := ctx.Value(ctxKey{}).(sessionCtx)
	return s.Session, ok
}

type sessionCtx struct {
	Session
	token string
}

// Handlers exposes the authentication HTTP endpoints.
type Handlers struct {
	svc *Service
	log *slog.Logger
}

// NewHandlers wires HTTP handlers to the service.
func NewHandlers(svc *Service, log *slog.Logger) *Handlers {
	return &Handlers{svc: svc, log: log}
}

// Register mounts the endpoints documented in docs/API.md.
func (h *Handlers) Register(mux *http.ServeMux) {
	mux.Handle("POST /api/auth/login", h.Middleware(http.HandlerFunc(h.login)))
	mux.Handle("POST /api/auth/logout", h.Middleware(h.RequireUser(h.RequireCSRF(http.HandlerFunc(h.logout)))))
	mux.Handle("GET /api/auth/session", h.Middleware(h.RequireUser(http.HandlerFunc(h.session))))
}

// Middleware attaches the session for a valid cookie. Invalid, expired or
// revoked cookies are cleared and the request continues anonymously.
func (h *Handlers) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie(CookieName)
		if err != nil || c.Value == "" {
			next.ServeHTTP(w, r)
			return
		}
		sess, err := h.svc.Lookup(r.Context(), c.Value)
		if errors.Is(err, ErrNoSession) {
			clearCookie(w)
			next.ServeHTTP(w, r)
			return
		}
		if err != nil {
			h.internal(w, "session lookup", err)
			return
		}
		ctx := context.WithValue(r.Context(), ctxKey{}, sessionCtx{Session: sess, token: c.Value})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireUser rejects anonymous requests with 401.
func (h *Handlers) RequireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := SessionFrom(r.Context()); !ok {
			writeError(w, http.StatusUnauthorized, "unauthenticated", "Sign in to continue.")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireCSRF checks the session's CSRF token on unsafe methods. It must run
// after RequireUser. It complements the origin check in the server wrapper.
func (h *Handlers) RequireCSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			next.ServeHTTP(w, r)
			return
		}
		sess, ok := SessionFrom(r.Context())
		got := r.Header.Get(CSRFHeader)
		if !ok || got == "" || subtle.ConstantTimeCompare([]byte(got), []byte(sess.CSRFToken)) != 1 {
			writeError(w, http.StatusForbidden, "csrf_rejected", "The request could not be verified. Reload the page and try again.")
			return
		}
		next.ServeHTTP(w, r)
	})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type userJSON struct {
	ID          int64  `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
}

type sessionJSON struct {
	User      userJSON  `json:"user"`
	CSRFToken string    `json:"csrfToken"`
	ExpiresAt time.Time `json:"expiresAt"`
}

func toJSON(s Session) sessionJSON {
	return sessionJSON{
		User:      userJSON{ID: s.User.ID, Email: s.User.Email, DisplayName: s.User.DisplayName},
		CSRFToken: s.CSRFToken,
		ExpiresAt: s.IdleExpiresAt,
	}
}

func (h *Handlers) login(w http.ResponseWriter, r *http.Request) {
	mt, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mt != "application/json" {
		writeError(w, http.StatusUnsupportedMediaType, "unsupported_media_type", "Send the request as application/json.")
		return
	}
	var req loginRequest
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxLoginBody))
	if err == nil {
		err = strictjson.Unmarshal(body, &req)
	}
	if err != nil || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "Email and password are required.")
		return
	}
	var previous string
	if cur, ok := r.Context().Value(ctxKey{}).(sessionCtx); ok {
		previous = cur.token
	} else if c, err := r.Cookie(CookieName); err == nil {
		previous = c.Value
	}
	token, sess, err := h.svc.Login(r.Context(), req.Email, req.Password, clientAddr(r), previous)
	var limited *RateLimitedError
	switch {
	case errors.As(err, &limited):
		w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(limited.RetryAfter.Seconds()))))
		writeError(w, http.StatusTooManyRequests, "rate_limited", "Too many sign-in attempts. Try again later.")
		return
	case errors.Is(err, ErrInvalidCredentials):
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Email or password is incorrect.")
		return
	case err != nil:
		h.internal(w, "login", err)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    token,
		Path:     "/",
		Expires:  sess.AbsoluteExpiresAt,
		Secure:   true,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, http.StatusOK, toJSON(sess))
}

func (h *Handlers) logout(w http.ResponseWriter, r *http.Request) {
	cur := r.Context().Value(ctxKey{}).(sessionCtx)
	if err := h.svc.Logout(r.Context(), cur.token); err != nil {
		h.internal(w, "logout", err)
		return
	}
	clearCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) session(w http.ResponseWriter, r *http.Request) {
	sess, _ := SessionFrom(r.Context())
	writeJSON(w, http.StatusOK, toJSON(sess))
}

func (h *Handlers) internal(w http.ResponseWriter, op string, err error) {
	// Errors never include request bodies, tokens or passwords.
	h.log.Error("auth failure", "op", op, "err", err)
	writeError(w, http.StatusInternalServerError, "internal", "Something went wrong. Try again later.")
}

func clearCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: CookieName, Value: "", Path: "/", MaxAge: -1,
		Secure: true, HttpOnly: true, SameSite: http.SameSiteLaxMode,
	})
}

// clientAddr is the TCP peer address. Proxy headers are deliberately not
// trusted until deployment defines the trusted proxy chain.
func clientAddr(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

type errorBody struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// WriteError writes the shared JSON error shape documented in docs/API.md.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	writeError(w, status, code, message)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	var b errorBody
	b.Error.Code = code
	b.Error.Message = message
	writeJSON(w, status, b)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
