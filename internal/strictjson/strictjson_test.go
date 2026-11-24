package strictjson

import (
	"runtime"
	"strings"
	"testing"
)

type node struct {
	Type     string `json:"type"`
	Src      string `json:"src,omitempty"`
	Ignored  string `json:"-"`
	Dash     string `json:"-,"`
	Children []node `json:"children,omitempty"`
}

type doc struct {
	Version int               `json:"version"`
	Blocks  []node            `json:"blocks"`
	Meta    map[string]string `json:"meta,omitempty"`
	Extra   any               `json:"extra,omitempty"`
	Ptr     *node             `json:"ptr,omitempty"`
}

func TestAcceptsExactKeys(t *testing.T) {
	for _, src := range []string{
		`{"version":1,"blocks":[{"type":"p","children":[{"type":"img","src":"/a"}]}]}`,
		`{"version":1,"blocks":[]}` + " \n\t\r",
		`{"blocks":null,"meta":{"Any":"x","ANY":"y"},"extra":{"k":[1,{"K":2}]},"ptr":{"type":"x"}}`,
		`{"blocks":[{"type":"x","-":"dash field"}]}`,
		`{"blocks":[{"\u0074ype":"escaped key equals type"}]}`,
	} {
		var d doc
		if err := Unmarshal([]byte(src), &d); err != nil {
			t.Errorf("%s: %v", src, err)
		}
	}
	var d doc
	if err := Unmarshal([]byte(`{"version":2,"blocks":[{"type":"img","src":"/a"}]}`), &d); err != nil ||
		d.Version != 2 || d.Blocks[0].Src != "/a" {
		t.Fatalf("decoded %+v, %v", d, err)
	}
}

func TestRejects(t *testing.T) {
	for name, src := range map[string]string{
		"upper-case key":             `{"VERSION":1}`,
		"title-case key":             `{"Version":1}`,
		"long s folds to s":          `{"blocks":[{"type":"img","ſrc":"/a"}]}`,
		"deep long s":                `{"blocks":[{"type":"x"}],"meta":{},"extra":1,"ptr":{"type":"x","children":[{"type":"y","ſrc":"x"}]}}`,
		"nested case fold":           `{"blocks":[{"type":"p","children":[{"type":"img","SRC":"/a"}]}]}`,
		"pointer case fold":          `{"ptr":{"Type":"x"}}`,
		"unknown key":                `{"version":1,"other":1}`,
		"ignored field by name":      `{"blocks":[{"type":"x","Ignored":"y"}]}`,
		"top-level duplicate":        `{"version":1,"version":2}`,
		"nested duplicate":           `{"blocks":[{"type":"img","src":"/a","src":"javascript:x"}]}`,
		"escaped duplicate":          `{"blocks":[{"src":"/a","\u0073rc":"javascript:x"}]}`,
		"duplicate in map":           `{"meta":{"a":"1","a":"2"}}`,
		"duplicate in any":           `{"extra":[{"a":1,"a":2}]}`,
		"duplicate in mistyped slot": `{"version":{"a":1,"a":2}}`,
		"trailing brace":             `{"version":1}}`,
		"trailing bracket":           `{"version":1}]`,
		"second value":               `{"version":1} {"version":2}`,
		"trailing scalar":            `{"version":1} 1`,
		"truncated":                  `{"version":1,"blocks":[`,
		"empty":                      ``,
		"wrong type":                 `{"version":"1"}`,
	} {
		var d doc
		if err := Unmarshal([]byte(src), &d); err == nil {
			t.Errorf("%s: accepted %s", name, src)
		}
	}
}

func TestKelvinAndLongSKeysAreUnknown(t *testing.T) {
	type kv struct {
		Key string `json:"key"`
	}
	for _, src := range []string{"{\"Key\":\"x\"}", `{"\u212Aey":"x"}`, `{"KEY":"x"}`} {
		var v kv
		err := Unmarshal([]byte(src), &v)
		if err == nil || !strings.Contains(err.Error(), "unknown field") {
			t.Errorf("%s: %v", src, err)
		}
	}
}

func TestRequiresPointer(t *testing.T) {
	var d doc
	if err := Unmarshal([]byte(`{}`), d); err == nil {
		t.Fatal("non-pointer target accepted")
	}
}

type custom struct{ A string }

func (c *custom) UnmarshalJSON([]byte) error { return nil }

func TestRefusesCustomUnmarshalers(t *testing.T) {
	var v struct {
		C custom `json:"c"`
	}
	if err := Unmarshal([]byte(`{"c":{"x":1}}`), &v); err == nil || !strings.Contains(err.Error(), "not supported") {
		t.Fatalf("custom decoder scanned as a plain struct: %v", err)
	}
}

func TestErrorNamesPath(t *testing.T) {
	var d doc
	err := Unmarshal([]byte(`{"blocks":[{"type":"p"},{"type":"p","children":[{"type":"i","SRC":"x"}]}]}`), &d)
	if err == nil || !strings.Contains(err.Error(), `"SRC" in $.blocks[1].children[0]`) {
		t.Fatalf("got %v", err)
	}
}

// Error paths are built only on failure: deep nesting near the 128 KiB lesson
// limit must not allocate per level in proportion to the depth.
func TestDeepNestingStaysLinear(t *testing.T) {
	var v struct {
		Title string `json:"title"`
	}
	for _, src := range []string{
		`{"title":` + strings.Repeat(`{"aaaaaaa":`, 9990) + `1` + strings.Repeat(`}`, 9991),
		`{"title":` + strings.Repeat(`[`, 9990) + strings.Repeat(`]`, 9990) + `}`,
	} {
		var before, after runtime.MemStats
		runtime.GC()
		runtime.ReadMemStats(&before)
		if err := Unmarshal([]byte(src), &v); err == nil {
			t.Fatal("mistyped title accepted")
		}
		runtime.ReadMemStats(&after)
		if alloc := after.TotalAlloc - before.TotalAlloc; alloc > 32<<20 {
			t.Fatalf("%d-byte input allocated %d MiB", len(src), alloc>>20)
		}
	}
}
