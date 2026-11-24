package rendering

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The Studio (web/studio) validates the same cases with its TypeScript port of
// Validate; both suites must agree on every case.
func TestStudioContractCases(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("..", "..", "web", "studio", "test", "contract", "cases.json"))
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct {
		Name   string `json:"name"`
		Valid  bool   `json:"valid"`
		Source string `json:"source"`
	}
	if err := json.Unmarshal(data, &cases); err != nil {
		t.Fatal(err)
	}
	if len(cases) == 0 {
		t.Fatal("no contract cases")
	}
	for _, c := range cases {
		_, err := Decode(strings.NewReader(c.Source))
		if (err == nil) != c.Valid {
			t.Errorf("%s: valid=%v, Go error=%v", c.Name, c.Valid, err)
		}
	}
}

// Documents exported by the Studio editor (golden files written by its tests)
// must pass Go validation and render through the canonical renderer.
func TestStudioGoldenExports(t *testing.T) {
	paths, err := filepath.Glob(filepath.Join("..", "..", "web", "studio", "test", "golden", "*.json"))
	if err != nil || len(paths) == 0 {
		t.Fatalf("no Studio golden exports: %v", err)
	}
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		doc, err := Decode(bytes.NewReader(data))
		if err != nil {
			t.Fatalf("%s: %v", path, err)
		}
		if _, err := Render(doc); err != nil {
			t.Fatalf("%s: render: %v", path, err)
		}
	}
}
