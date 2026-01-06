package crypto

import (
	"strings"
	"testing"
)

func TestHashPassword(t *testing.T) {
	tests := []struct {
		name        string
		password    string
		params      *Argon2Params
		expectError bool
	}{
		{
			name:        "valid password with default params",
			password:    "MySecurePassword123!",
			params:      nil,
			expectError: false,
		},
		{
			name:     "valid password with custom params",
			password: "AnotherPassword456!",
			params: &Argon2Params{
				Memory:      32768,
				Iterations:  2,
				Parallelism: 1,
				SaltLength:  16,
				KeyLength:   32,
			},
			expectError: false,
		},
		{
			name:        "empty password",
			password:    "",
			params:      nil,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password, tt.params)

			if tt.expectError {
				if err == nil {
					t.Errorf("expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			if hash == "" {
				t.Error("expected non-empty hash")
			}

			// Verify hash format
			if !strings.HasPrefix(hash, "$argon2id$") {
				t.Errorf("invalid hash format: %s", hash)
			}
		})
	}
}

func TestVerifyPassword(t *testing.T) {
	password := "MySecurePassword123!"
	params := DefaultArgon2Params()

	// Generate hash
	hash, err := HashPassword(password, params)
	if err != nil {
		t.Fatalf("failed to generate hash: %v", err)
	}

	tests := []struct {
		name          string
		password      string
		hash          string
		expectMatch   bool
		expectError   bool
	}{
		{
			name:        "correct password",
			password:    password,
			hash:        hash,
			expectMatch: true,
			expectError: false,
		},
		{
			name:        "incorrect password",
			password:    "WrongPassword",
			hash:        hash,
			expectMatch: false,
			expectError: false,
		},
		{
			name:        "empty password",
			password:    "",
			hash:        hash,
			expectMatch: false,
			expectError: true,
		},
		{
			name:        "empty hash",
			password:    password,
			hash:        "",
			expectMatch: false,
			expectError: true,
		},
		{
			name:        "invalid hash format",
			password:    password,
			hash:        "invalid_hash",
			expectMatch: false,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			match, err := VerifyPassword(tt.password, tt.hash)

			if tt.expectError {
				if err == nil {
					t.Error("expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			if match != tt.expectMatch {
				t.Errorf("expected match=%v, got match=%v", tt.expectMatch, match)
			}
		})
	}
}

func TestHashPassword_Deterministic(t *testing.T) {
	password := "TestPassword123!"
	params := DefaultArgon2Params()

	// Generate two hashes with the same password
	hash1, err1 := HashPassword(password, params)
	hash2, err2 := HashPassword(password, params)

	if err1 != nil || err2 != nil {
		t.Fatalf("failed to generate hashes: %v, %v", err1, err2)
	}

	// Hashes should be different due to random salt
	if hash1 == hash2 {
		t.Error("hashes should be different due to random salt")
	}

	// Both hashes should verify the same password
	match1, err := VerifyPassword(password, hash1)
	if err != nil || !match1 {
		t.Error("hash1 should verify the password")
	}

	match2, err := VerifyPassword(password, hash2)
	if err != nil || !match2 {
		t.Error("hash2 should verify the password")
	}
}

func TestNeedsRehash(t *testing.T) {
	password := "TestPassword123!"

	oldParams := &Argon2Params{
		Memory:      32768,
		Iterations:  2,
		Parallelism: 1,
		SaltLength:  16,
		KeyLength:   32,
	}

	newParams := &Argon2Params{
		Memory:      65536,
		Iterations:  3,
		Parallelism: 2,
		SaltLength:  16,
		KeyLength:   32,
	}

	// Generate hash with old parameters
	hash, err := HashPassword(password, oldParams)
	if err != nil {
		t.Fatalf("failed to generate hash: %v", err)
	}

	tests := []struct {
		name          string
		hash          string
		currentParams *Argon2Params
		expectRehash  bool
		expectError   bool
	}{
		{
			name:          "needs rehash with different params",
			hash:          hash,
			currentParams: newParams,
			expectRehash:  true,
			expectError:   false,
		},
		{
			name:          "no rehash needed with same params",
			hash:          hash,
			currentParams: oldParams,
			expectRehash:  false,
			expectError:   false,
		},
		{
			name:          "invalid hash format",
			hash:          "invalid_hash",
			currentParams: newParams,
			expectRehash:  false,
			expectError:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			needsRehash, err := NeedsRehash(tt.hash, tt.currentParams)

			if tt.expectError {
				if err == nil {
					t.Error("expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			if needsRehash != tt.expectRehash {
				t.Errorf("expected needsRehash=%v, got needsRehash=%v", tt.expectRehash, needsRehash)
			}
		})
	}
}

func BenchmarkHashPassword(b *testing.B) {
	params := DefaultArgon2Params()
	password := "BenchmarkPassword123!"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := HashPassword(password, params)
		if err != nil {
			b.Fatalf("failed to hash password: %v", err)
		}
	}
}

func BenchmarkVerifyPassword(b *testing.B) {
	params := DefaultArgon2Params()
	password := "BenchmarkPassword123!"

	hash, err := HashPassword(password, params)
	if err != nil {
		b.Fatalf("failed to generate hash: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := VerifyPassword(password, hash)
		if err != nil {
			b.Fatalf("failed to verify password: %v", err)
		}
	}
}
