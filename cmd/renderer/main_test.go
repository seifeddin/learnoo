package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hadden-me/learnoo/internal/rendering"
)

func request(method, path string, body []byte) *http.Request {
	r := httptest.NewRequest(method, "http://127.0.0.1:8080"+path, bytes.NewReader(body))
	return r
}
func TestPreviewMatchesReader(t *testing.T) {
	h := handler()
	reader := httptest.NewRecorder()
	h.ServeHTTP(reader, request("GET", "/lesson", nil))
	raw, _ := rendering.Files.ReadFile("fixtures/complex-numbers.json")
	r := request("POST", "/preview", raw)
	r.Header.Set("Content-Type", "application/json")
	preview := httptest.NewRecorder()
	h.ServeHTTP(preview, r)
	if reader.Code != 200 || preview.Code != 200 || reader.Body.String() != preview.Body.String() {
		t.Fatal("reader and preview differ")
	}
	if preview.Header().Get("Content-Security-Policy") == "" || preview.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("missing prototype security headers")
	}
}
func TestRejectedRequests(t *testing.T) {
	for _, tc := range []struct {
		name, method, path, host, site, content string
		body                                    []byte
		want                                    int
	}{
		{name: "rebind", method: "GET", path: "/lesson", host: "evil.example:8080", want: 403},
		{name: "cross origin", method: "POST", path: "/preview", site: "cross-site", content: "application/json", body: []byte(`{}`), want: 403},
		{name: "wrong media", method: "POST", path: "/preview", content: "text/plain", want: 415},
		{name: "invalid json", method: "POST", path: "/preview", content: "application/json", body: []byte(`{}`), want: 400},
		{name: "large request", method: "POST", path: "/preview", content: "application/json", body: bytes.Repeat([]byte("x"), rendering.MaxDocumentBytes+1), want: 400},
		{name: "unknown path", method: "GET", path: "/secret", want: 404},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r := request(tc.method, tc.path, tc.body)
			if tc.host != "" {
				r.Host = tc.host
			}
			r.Header.Set("Sec-Fetch-Site", tc.site)
			r.Header.Set("Content-Type", tc.content)
			w := httptest.NewRecorder()
			handler().ServeHTTP(w, r)
			if w.Code != tc.want {
				t.Fatalf("got %d want %d", w.Code, tc.want)
			}
		})
	}
}
