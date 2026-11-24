// Package strictjson decodes one JSON value with exact field names.
//
// encoding/json matches object keys to struct fields case-insensitively, with
// Unicode folding ("ſrc" and "SRC" both fill Src), and keeps the last of
// duplicate keys. A validator built on it can therefore approve a value that
// an exact-key consumer of the same bytes reads differently. Unmarshal first
// scans the input against the target type and rejects any key that is not
// exactly a field's JSON name, any duplicate key in any object, and anything
// after the single top-level value; only then does it decode.
package strictjson

import (
	"bytes"
	"encoding"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"reflect"
	"strconv"
	"strings"
)

// Unmarshal decodes data into v, which must be a non-nil pointer. Struct
// targets accept only keys that equal a field's JSON name byte for byte;
// map and interface targets accept any key. Every object, at any depth, must
// have unique keys (compared after unescaping). Trailing whitespace is
// allowed; any other data after the value is an error. Types with their own
// UnmarshalJSON or UnmarshalText are refused rather than scanned wrongly.
func Unmarshal(data []byte, v any) error {
	rv := reflect.ValueOf(v)
	if rv.Kind() != reflect.Pointer || rv.IsNil() {
		return errors.New("strictjson: target must be a non-nil pointer")
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()
	var path []string
	if err := scan(dec, rv.Type().Elem(), &path); err != nil {
		return err
	}
	if _, err := dec.Token(); err != io.EOF {
		return errors.New("unexpected data after the JSON value")
	}
	exact := json.NewDecoder(bytes.NewReader(data))
	exact.DisallowUnknownFields()
	return exact.Decode(v)
}

var (
	jsonUnmarshaler = reflect.TypeFor[json.Unmarshaler]()
	textUnmarshaler = reflect.TypeFor[encoding.TextUnmarshaler]()
)

// scan reads one value from dec. t is the type it will decode into, or nil
// when any value is acceptable. path holds the segments leading to the value;
// it is joined only when reporting an error, so memory stays linear in depth.
func scan(dec *json.Decoder, t reflect.Type, path *[]string) error {
	for t != nil && t.Kind() == reflect.Pointer {
		t = t.Elem()
	}
	if t != nil && (t.Implements(jsonUnmarshaler) || reflect.PointerTo(t).Implements(jsonUnmarshaler) ||
		t.Implements(textUnmarshaler) || reflect.PointerTo(t).Implements(textUnmarshaler)) {
		return fmt.Errorf("strictjson: %s has custom JSON decoding and is not supported", t)
	}
	tok, err := dec.Token()
	if err != nil {
		if err == io.EOF {
			return io.ErrUnexpectedEOF
		}
		return err
	}
	delim, ok := tok.(json.Delim)
	if !ok {
		return nil // scalar; type mismatches are reported by Decode
	}
	switch delim {
	case '[':
		var elem reflect.Type
		if t != nil && (t.Kind() == reflect.Slice || t.Kind() == reflect.Array) {
			elem = t.Elem()
		}
		for i := 0; dec.More(); i++ {
			*path = append(*path, "["+strconv.Itoa(i)+"]")
			if err := scan(dec, elem, path); err != nil {
				return err
			}
			*path = (*path)[:len(*path)-1]
		}
	case '{':
		var fields map[string]reflect.Type
		var elem reflect.Type
		if t != nil {
			switch t.Kind() {
			case reflect.Struct:
				fields, err = jsonFields(t)
				if err != nil {
					return err
				}
			case reflect.Map:
				elem = t.Elem()
			}
		}
		seen := map[string]bool{}
		for dec.More() {
			tok, err := dec.Token()
			if err != nil {
				return err
			}
			key := tok.(string)
			if seen[key] {
				return fmt.Errorf("duplicate key %q in %s", key, joinPath(*path))
			}
			seen[key] = true
			next := elem
			if fields != nil {
				ft, ok := fields[key]
				if !ok {
					return fmt.Errorf("unknown field %q in %s", key, joinPath(*path))
				}
				next = ft
			}
			*path = append(*path, "."+key)
			if err := scan(dec, next, path); err != nil {
				return err
			}
			*path = (*path)[:len(*path)-1]
		}
	default:
		return fmt.Errorf("unexpected %q", delim)
	}
	_, err = dec.Token() // closing delimiter
	return err
}

func joinPath(path []string) string {
	return "$" + strings.Join(path, "")
}

// jsonFields maps each exported field's exact JSON name to its type.
func jsonFields(t reflect.Type) (map[string]reflect.Type, error) {
	fields := map[string]reflect.Type{}
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		if f.Anonymous {
			return nil, fmt.Errorf("strictjson: embedded field %s in %s is not supported", f.Name, t)
		}
		if !f.IsExported() {
			continue
		}
		tag := f.Tag.Get("json")
		if tag == "-" {
			continue
		}
		name, _, _ := strings.Cut(tag, ",")
		if name == "" {
			name = f.Name
		}
		fields[name] = f.Type
	}
	return fields, nil
}
