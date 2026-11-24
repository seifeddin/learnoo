// Package server assembles the authenticated application's HTTP handler.
// It is separate from cmd/renderer, which stays an isolated experiment.
package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/hadden-me/learnoo/internal/auth"
	"github.com/jackc/pgx/v5/pgxpool"
)

// New returns the root handler: routes wrapped in origin-based CSRF
// protection and security headers.
func New(db *pgxpool.Pool, svc *auth.Service, log *slog.Logger) http.Handler {
	mux := http.NewServeMux()
	auth.NewHandlers(svc, log).Register(mux)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := db.Ping(ctx); err != nil {
			log.Error("health check", "err", err)
			auth.WriteError(w, http.StatusServiceUnavailable, "unavailable", "Database unavailable.")
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_, _ = w.Write([]byte(`{"status":"ok"}` + "\n"))
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		auth.WriteError(w, http.StatusNotFound, "not_found", "Not found.")
	})

	// Rejects cross-origin unsafe requests using Sec-Fetch-Site / Origin
	// (Go 1.25). Session-bound CSRF tokens add a second check on
	// authenticated mutations; this layer also covers login CSRF.
	cop := http.NewCrossOriginProtection()
	cop.SetDenyHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth.WriteError(w, http.StatusForbidden, "cross_origin_rejected", "Cross-origin request rejected.")
	}))
	return securityHeaders(cop.Handler(mux))
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		// Every response may depend on the session: never store in shared caches.
		h.Set("Cache-Control", "no-store")
		h.Set("Vary", "Cookie")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "same-origin")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		next.ServeHTTP(w, r)
	})
}
