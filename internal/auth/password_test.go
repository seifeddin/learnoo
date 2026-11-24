package auth

import (
	"strings"
	"testing"
)

func TestPasswordHashRoundTrip(t *testing.T) {
	h, err := HashPassword("correct horse battery", DefaultArgon2)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(h, "$argon2id$v=19$m=19456,t=2,p=1$") {
		t.Fatalf("unexpected encoding %q", h)
	}
	if ok, err := VerifyPassword("correct horse battery", h); err != nil || !ok {
		t.Fatalf("correct password rejected: %v", err)
	}
	if ok, _ := VerifyPassword("correct horse batterY", h); ok {
		t.Fatal("wrong password accepted")
	}
	h2, _ := HashPassword("correct horse battery", DefaultArgon2)
	if h == h2 {
		t.Fatal("salt not random")
	}
}

func TestVerifyRejectsMalformedOrHostileHashes(t *testing.T) {
	for _, h := range []string{
		"",
		"plaintext",
		"$argon2i$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$a2V5a2V5a2V5a2V5a2V5aw",
		"$argon2id$v=16$m=19456,t=2,p=1$c2FsdHNhbHQ$a2V5a2V5a2V5a2V5a2V5aw",
		"$argon2id$v=19$m=4194304,t=2,p=1$c2FsdHNhbHQ$a2V5a2V5a2V5a2V5a2V5aw", // 4 GiB
		"$argon2id$v=19$m=19456,t=1000,p=1$c2FsdHNhbHQ$a2V5a2V5a2V5a2V5a2V5aw",
		"$argon2id$v=19$m=19456,t=2,p=1$!!$a2V5a2V5a2V5a2V5a2V5aw",
	} {
		if ok, err := VerifyPassword("x", h); ok || err == nil {
			t.Errorf("%q: want malformed error, got ok=%v err=%v", h, ok, err)
		}
	}
}

func TestOversizedPasswordNeverMatches(t *testing.T) {
	long := strings.Repeat("a", MaxPasswordBytes+1)
	if _, err := HashPassword(long, DefaultArgon2); err == nil {
		t.Fatal("hashing oversized password should fail")
	}
	h, _ := HashPassword("short-password", DefaultArgon2)
	if ok, _ := VerifyPassword(long, h); ok {
		t.Fatal("oversized password matched")
	}
}
