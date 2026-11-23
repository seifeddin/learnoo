// This local experiment is not the authenticated Learnoo application.
package main

import (
	"bytes"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/hadden-me/learnoo/internal/rendering"
)

func handler() http.Handler {
	mux := http.NewServeMux()
	assets, _ := fs.Sub(rendering.Files, "static")
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.FS(assets))))
	for route, name := range map[string]string{"/": "complex-numbers", "/lesson": "complex-numbers", "/bidi": "bidi", "/failure": "failure"} {
		mux.HandleFunc("GET "+route, func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != route {
				http.NotFound(w, r)
				return
			}
			doc, err := rendering.Fixture(name)
			if err != nil {
				http.Error(w, "Fixture unavailable", 500)
				return
			}
			render(w, doc)
		})
	}
	mux.HandleFunc("GET /lab", func(w http.ResponseWriter, r *http.Request) {
		data, _ := rendering.Files.ReadFile("static/lab.html")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(data)
	})
	mux.HandleFunc("GET /fixture", func(w http.ResponseWriter, r *http.Request) {
		data, _ := rendering.Files.ReadFile("fixtures/complex-numbers.json")
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Write(data)
	})
	mux.HandleFunc("POST /preview", func(w http.ResponseWriter, r *http.Request) {
		if strings.Split(r.Header.Get("Content-Type"), ";")[0] != "application/json" {
			http.Error(w, "Expected application/json", 415)
			return
		}
		if site := r.Header.Get("Sec-Fetch-Site"); site != "" && site != "same-origin" && site != "none" {
			http.Error(w, "Cross-origin preview denied", 403)
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, rendering.MaxDocumentBytes)
		doc, err := rendering.Decode(r.Body)
		if err != nil {
			http.Error(w, "Invalid lesson: "+err.Error(), 400)
			return
		}
		render(w, doc)
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent DNS-rebinding access to this intentionally unauthenticated local experiment.
		host, _, hostErr := net.SplitHostPort(r.Host)
		if hostErr != nil || (host != "127.0.0.1" && host != "localhost") {
			http.Error(w, "Loopback host required", 403)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; frame-src 'self' https://www.youtube-nocookie.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'")
		mux.ServeHTTP(w, r)
	})
}

func render(w http.ResponseWriter, doc rendering.Document) {
	start := time.Now()
	data, err := rendering.Render(doc)
	if err != nil {
		http.Error(w, "Cannot render lesson", 400)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Server-Timing", fmt.Sprintf("render;dur=%.3f", float64(time.Since(start).Microseconds())/1000))
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	bytes.NewReader(data).WriteTo(w)
}

func main() {
	port := flag.Int("port", 8080, "loopback-only prototype port")
	flag.Parse()
	if *port < 1 || *port > 65535 {
		log.Fatal("invalid port")
	}
	addr := fmt.Sprintf("127.0.0.1:%d", *port)
	server := &http.Server{Addr: addr, Handler: handler(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 16 << 10}
	log.Printf("Unreviewed local renderer: http://%s (not for public deployment)", addr)
	log.Fatal(server.ListenAndServe())
}
