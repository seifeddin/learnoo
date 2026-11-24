// Command server runs the Learnoo application server (LRN-005 foundation).
//
//	server serve                    start the HTTP server (default)
//	server migrate [-check]         apply or verify database migrations
//	server create-user -email E -name N   create an account; password on stdin
//
// Configuration comes from environment variables; see docs/DEVELOPMENT.md.
package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
	"unicode/utf8"

	"github.com/hadden-me/learnoo/internal/auth"
	"github.com/hadden-me/learnoo/internal/database"
	"github.com/hadden-me/learnoo/internal/server"
	"github.com/hadden-me/learnoo/internal/users"
	"github.com/hadden-me/learnoo/migrations"
)

const defaultAddr = "127.0.0.1:8090"

// MinPasswordLen is enforced when creating accounts.
const MinPasswordLen = 12

func main() {
	log := slog.New(slog.NewTextHandler(os.Stderr, nil))
	if err := run(os.Args[1:], os.Stdin, os.Stdout, log); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func run(args []string, stdin io.Reader, stdout io.Writer, log *slog.Logger) error {
	cmd := "serve"
	if len(args) > 0 && !strings.HasPrefix(args[0], "-") {
		cmd, args = args[0], args[1:]
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	switch cmd {
	case "serve":
		return serve(ctx, args, log)
	case "migrate":
		return migrate(ctx, args, stdout)
	case "create-user":
		return createUser(ctx, args, stdin, stdout)
	default:
		return fmt.Errorf("unknown command %q (want serve, migrate or create-user)", cmd)
	}
}

func databaseURL() (string, error) {
	url := os.Getenv("LEARNOO_DATABASE_URL")
	if url == "" {
		return "", errors.New("LEARNOO_DATABASE_URL is not set")
	}
	return url, nil
}

func serve(ctx context.Context, args []string, log *slog.Logger) error {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	addr := os.Getenv("LEARNOO_ADDR")
	if addr == "" {
		addr = defaultAddr
	}
	if err := requireLoopback(addr); err != nil {
		return err
	}
	url, err := databaseURL()
	if err != nil {
		return err
	}
	pool, err := database.Open(ctx, url)
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := database.Check(ctx, pool, migrations.FS); err != nil {
		return fmt.Errorf("%w (run: server migrate)", err)
	}
	svc, err := auth.New(pool, auth.DefaultConfig, nil)
	if err != nil {
		return err
	}
	srv := &http.Server{
		Addr:              addr,
		Handler:           server.New(pool, svc, log),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    16 << 10,
	}
	errc := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", "http://"+addr)
		errc <- srv.ListenAndServe()
	}()
	select {
	case err := <-errc:
		return err
	case <-ctx.Done():
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}

// requireLoopback keeps the server off public interfaces until deployment
// work defines TLS termination and the trusted proxy chain (client address
// for throttling depends on it).
func requireLoopback(addr string) error {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return fmt.Errorf("LEARNOO_ADDR: %w", err)
	}
	if host == "localhost" {
		return nil
	}
	ip := net.ParseIP(host)
	if ip == nil || !ip.IsLoopback() {
		return fmt.Errorf("LEARNOO_ADDR %q is not a loopback address; public binding waits for the deployment work", addr)
	}
	return nil
}

func migrate(ctx context.Context, args []string, stdout io.Writer) error {
	fs := flag.NewFlagSet("migrate", flag.ContinueOnError)
	check := fs.Bool("check", false, "verify every migration is applied unchanged; apply nothing")
	if err := fs.Parse(args); err != nil {
		return err
	}
	url, err := databaseURL()
	if err != nil {
		return err
	}
	pool, err := database.Open(ctx, url)
	if err != nil {
		return err
	}
	defer pool.Close()
	if *check {
		if err := database.Check(ctx, pool, migrations.FS); err != nil {
			return err
		}
		fmt.Fprintln(stdout, "migrations up to date")
		return nil
	}
	applied, err := database.Migrate(ctx, pool, migrations.FS)
	for _, name := range applied {
		fmt.Fprintln(stdout, "applied", name)
	}
	if err != nil {
		return err
	}
	if len(applied) == 0 {
		fmt.Fprintln(stdout, "migrations up to date")
	}
	return nil
}

// createUser makes an account with no roles. It is a local/operator tool,
// not public registration; role grants arrive with LRN-013.
func createUser(ctx context.Context, args []string, stdin io.Reader, stdout io.Writer) error {
	fs := flag.NewFlagSet("create-user", flag.ContinueOnError)
	email := fs.String("email", "", "account email (required)")
	name := fs.String("name", "", "display name (required)")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *email == "" || *name == "" {
		return errors.New("create-user needs -email and -name; the password is read from stdin")
	}
	line, err := bufio.NewReader(io.LimitReader(stdin, auth.MaxPasswordBytes+2)).ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return fmt.Errorf("read password: %w", err)
	}
	password := strings.TrimRight(line, "\r\n")
	if n := utf8.RuneCountInString(password); n < MinPasswordLen {
		return fmt.Errorf("password must be at least %d characters", MinPasswordLen)
	}
	if len(password) > auth.MaxPasswordBytes {
		return fmt.Errorf("password must be at most %d bytes", auth.MaxPasswordBytes)
	}
	url, err := databaseURL()
	if err != nil {
		return err
	}
	pool, err := database.Open(ctx, url)
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := database.Check(ctx, pool, migrations.FS); err != nil {
		return fmt.Errorf("%w (run: server migrate)", err)
	}
	hash, err := auth.HashPassword(password, auth.DefaultArgon2)
	if err != nil {
		return err
	}
	u, err := users.Create(ctx, pool, *email, *name, hash)
	if err != nil {
		return err
	}
	fmt.Fprintf(stdout, "created user %d (%s)\n", u.ID, u.Email)
	return nil
}
