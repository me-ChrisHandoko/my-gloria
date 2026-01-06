package crypto

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

var (
	// ErrInvalidHash is returned when the provided hash has invalid format
	ErrInvalidHash = errors.New("invalid hash format")

	// ErrIncompatibleVersion is returned when the hash version is not supported
	ErrIncompatibleVersion = errors.New("incompatible argon2 version")
)

// Argon2Params holds the parameters for Argon2id hashing
type Argon2Params struct {
	Memory      uint32 // Memory in KiB
	Iterations  uint32 // Number of iterations (time cost)
	Parallelism uint8  // Number of threads
	SaltLength  uint32 // Salt length in bytes
	KeyLength   uint32 // Output key length in bytes
}

// DefaultArgon2Params provides secure default parameters for production
// These are based on OWASP recommendations for 2024
func DefaultArgon2Params() *Argon2Params {
	return &Argon2Params{
		Memory:      65536, // 64 MiB
		Iterations:  3,     // 3 iterations
		Parallelism: 2,     // 2 threads
		SaltLength:  16,    // 16 bytes
		KeyLength:   32,    // 32 bytes
	}
}

// HashPassword generates an Argon2id hash of the password using the provided parameters
// The returned hash is in the format: $argon2id$v=19$m=65536,t=3,p=2$salt$hash
func HashPassword(password string, params *Argon2Params) (string, error) {
	if password == "" {
		return "", errors.New("password cannot be empty")
	}

	if params == nil {
		params = DefaultArgon2Params()
	}

	// Generate random salt
	salt := make([]byte, params.SaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("failed to generate salt: %w", err)
	}

	// Generate hash using Argon2id
	hash := argon2.IDKey(
		[]byte(password),
		salt,
		params.Iterations,
		params.Memory,
		params.Parallelism,
		params.KeyLength,
	)

	// Encode salt and hash to base64
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	// Format: $argon2id$v=19$m=65536,t=3,p=2$salt$hash
	encodedHash := fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		params.Memory,
		params.Iterations,
		params.Parallelism,
		b64Salt,
		b64Hash,
	)

	return encodedHash, nil
}

// VerifyPassword verifies if the provided password matches the hash
func VerifyPassword(password, encodedHash string) (bool, error) {
	if password == "" {
		return false, errors.New("password cannot be empty")
	}

	if encodedHash == "" {
		return false, errors.New("hash cannot be empty")
	}

	// Extract parameters from the encoded hash
	params, salt, hash, err := decodeHash(encodedHash)
	if err != nil {
		return false, err
	}

	// Generate hash from the provided password using the same parameters
	otherHash := argon2.IDKey(
		[]byte(password),
		salt,
		params.Iterations,
		params.Memory,
		params.Parallelism,
		params.KeyLength,
	)

	// Use constant-time comparison to prevent timing attacks
	if subtle.ConstantTimeCompare(hash, otherHash) == 1 {
		return true, nil
	}

	return false, nil
}

// decodeHash extracts parameters, salt, and hash from the encoded string
// Expected format: $argon2id$v=19$m=65536,t=3,p=2$salt$hash
func decodeHash(encodedHash string) (*Argon2Params, []byte, []byte, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return nil, nil, nil, ErrInvalidHash
	}

	// Verify algorithm
	if parts[1] != "argon2id" {
		return nil, nil, nil, ErrInvalidHash
	}

	// Verify version
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return nil, nil, nil, ErrInvalidHash
	}
	if version != argon2.Version {
		return nil, nil, nil, ErrIncompatibleVersion
	}

	// Extract parameters
	params := &Argon2Params{}
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d",
		&params.Memory,
		&params.Iterations,
		&params.Parallelism,
	); err != nil {
		return nil, nil, nil, ErrInvalidHash
	}

	// Decode salt
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to decode salt: %w", err)
	}
	params.SaltLength = uint32(len(salt))

	// Decode hash
	hash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to decode hash: %w", err)
	}
	params.KeyLength = uint32(len(hash))

	return params, salt, hash, nil
}

// NeedsRehash checks if a hash needs to be regenerated with updated parameters
// This is useful when you want to upgrade security parameters for existing users
func NeedsRehash(encodedHash string, currentParams *Argon2Params) (bool, error) {
	if currentParams == nil {
		currentParams = DefaultArgon2Params()
	}

	params, _, _, err := decodeHash(encodedHash)
	if err != nil {
		return false, err
	}

	// Check if any parameter differs
	if params.Memory != currentParams.Memory ||
		params.Iterations != currentParams.Iterations ||
		params.Parallelism != currentParams.Parallelism ||
		params.KeyLength != currentParams.KeyLength {
		return true, nil
	}

	return false, nil
}
