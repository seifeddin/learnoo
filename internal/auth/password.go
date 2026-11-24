package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Argon2Params are Argon2id cost parameters. Defaults follow the OWASP
// Password Storage Cheat Sheet minimum (19 MiB, 2 iterations, 1 lane), kept
// modest so concurrent logins fit the shared server's memory.
type Argon2Params struct {
	MemoryKiB  uint32
	Iterations uint32
	Lanes      uint8
	SaltLen    uint32
	KeyLen     uint32
}

// DefaultArgon2 is used for new password hashes.
var DefaultArgon2 = Argon2Params{MemoryKiB: 19 * 1024, Iterations: 2, Lanes: 1, SaltLen: 16, KeyLen: 32}

// Limits accepted when verifying a stored hash, so a corrupted or hostile
// row cannot force excessive memory or CPU use.
const (
	maxMemoryKiB  = 256 * 1024
	maxIterations = 10
	maxLanes      = 8
)

// MaxPasswordBytes bounds the input given to the hash function.
const MaxPasswordBytes = 1024

var errMalformedHash = errors.New("malformed password hash")

// HashPassword returns a PHC-format Argon2id hash:
// $argon2id$v=19$m=<KiB>,t=<iter>,p=<lanes>$<salt>$<key>
func HashPassword(password string, p Argon2Params) (string, error) {
	if len(password) > MaxPasswordBytes {
		return "", fmt.Errorf("password longer than %d bytes", MaxPasswordBytes)
	}
	salt := make([]byte, p.SaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := argon2.IDKey([]byte(password), salt, p.Iterations, p.MemoryKiB, p.Lanes, p.KeyLen)
	enc := base64.RawStdEncoding
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, p.MemoryKiB, p.Iterations, p.Lanes, enc.EncodeToString(salt), enc.EncodeToString(key)), nil
}

// VerifyPassword reports whether password matches the encoded hash, using a
// constant-time comparison. Malformed hashes never match.
func VerifyPassword(password, encoded string) (bool, error) {
	if len(password) > MaxPasswordBytes {
		return false, nil
	}
	p, salt, key, err := decodeHash(encoded)
	if err != nil {
		return false, err
	}
	got := argon2.IDKey([]byte(password), salt, p.Iterations, p.MemoryKiB, p.Lanes, uint32(len(key)))
	return subtle.ConstantTimeCompare(got, key) == 1, nil
}

func decodeHash(encoded string) (Argon2Params, []byte, []byte, error) {
	var p Argon2Params
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[0] != "" || parts[1] != "argon2id" {
		return p, nil, nil, errMalformedHash
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return p, nil, nil, errMalformedHash
	}
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &p.MemoryKiB, &p.Iterations, &p.Lanes); err != nil {
		return p, nil, nil, errMalformedHash
	}
	if p.MemoryKiB == 0 || p.MemoryKiB > maxMemoryKiB || p.Iterations == 0 || p.Iterations > maxIterations || p.Lanes == 0 || p.Lanes > maxLanes {
		return p, nil, nil, errMalformedHash
	}
	enc := base64.RawStdEncoding
	salt, err := enc.DecodeString(parts[4])
	if err != nil || len(salt) < 8 {
		return p, nil, nil, errMalformedHash
	}
	key, err := enc.DecodeString(parts[5])
	if err != nil || len(key) < 16 || len(key) > 64 {
		return p, nil, nil, errMalformedHash
	}
	return p, salt, key, nil
}
