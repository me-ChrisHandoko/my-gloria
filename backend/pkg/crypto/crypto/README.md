# Password Hashing with Argon2id

This package provides secure password hashing using Argon2id algorithm, which is the recommended password hashing function by OWASP as of 2024.

## Why Argon2id?

Argon2id is superior to bcrypt for several reasons:

1. **Modern Algorithm**: Winner of the Password Hashing Competition (2015)
2. **Memory-Hard**: Resistant to GPU/ASIC attacks
3. **Configurable**: Fine-tune security vs performance
4. **Side-Channel Resistant**: Better protection against timing attacks
5. **Future-Proof**: Supports increased security parameters as hardware improves

## Usage

### Basic Usage

```go
import "backend/internal/pkg/crypto"

// Hash a password
hash, err := crypto.HashPassword("userPassword123", nil)
if err != nil {
    // handle error
}

// Verify a password
match, err := crypto.VerifyPassword("userPassword123", hash)
if err != nil {
    // handle error
}

if match {
    // password is correct
}
```

### Using Custom Parameters

```go
import "backend/internal/pkg/crypto"

// Create custom parameters
params := &crypto.Argon2Params{
    Memory:      65536, // 64 MiB
    Iterations:  3,
    Parallelism: 2,
    SaltLength:  16,
    KeyLength:   32,
}

hash, err := crypto.HashPassword("userPassword123", params)
```

### Using Config-Based Parameters

```go
import (
    "backend/configs"
    "backend/internal/pkg/crypto"
)

// Load config
cfg := configs.Load()

// Create params from config
params := crypto.ParamsFromConfig(
    cfg.Security.Argon2Memory,
    cfg.Security.Argon2Iterations,
    cfg.Security.Argon2Parallelism,
    cfg.Security.Argon2SaltLength,
    cfg.Security.Argon2KeyLength,
)

hash, err := crypto.HashPassword("userPassword123", params)
```

### Check if Rehash is Needed

When you upgrade security parameters, you can check if existing hashes need to be regenerated:

```go
import "backend/internal/pkg/crypto"

// Current parameters (e.g., from config)
currentParams := crypto.ProductionParams()

// Check if an existing hash needs upgrade
needsRehash, err := crypto.NeedsRehash(existingHash, currentParams)
if err != nil {
    // handle error
}

if needsRehash {
    // Rehash password on next successful login
}
```

## Configuration

### Development Environment

```yaml
security:
  argon2_memory: 65536        # 64 MiB
  argon2_iterations: 3
  argon2_parallelism: 2
  argon2_salt_length: 16
  argon2_key_length: 32
```

### Production Environment

```yaml
security:
  argon2_memory: 131072       # 128 MiB
  argon2_iterations: 4
  argon2_parallelism: 4
  argon2_salt_length: 16
  argon2_key_length: 32
```

## Hash Format

Hashes are stored in PHC string format:

```
$argon2id$v=19$m=65536,t=3,p=2$saltBase64$hashBase64
```

Where:
- `argon2id`: Algorithm identifier
- `v=19`: Argon2 version
- `m=65536`: Memory in KiB
- `t=3`: Time cost (iterations)
- `p=2`: Parallelism degree
- `saltBase64`: Base64-encoded salt
- `hashBase64`: Base64-encoded hash

## Security Considerations

1. **Never store plaintext passwords**
2. **Use appropriate parameters for your environment**
3. **Consider rehashing on login when upgrading parameters**
4. **Protect configuration files containing security parameters**
5. **Monitor hash generation time (should be 0.5-1 second)**

## Performance

Typical hash generation times on modern hardware:

- **Development params**: ~100-200ms
- **Production params**: ~500-1000ms

This intentional slowness is a security feature that makes brute-force attacks impractical.

## Testing

Run tests with:

```bash
go test ./internal/pkg/crypto
```

Run benchmarks with:

```bash
go test -bench=. ./internal/pkg/crypto
```

## Migration from bcrypt

If migrating from bcrypt:

1. Keep bcrypt verification code temporarily
2. On successful login with bcrypt hash:
   - Verify with bcrypt
   - Rehash with Argon2id
   - Update database
3. After migration period, remove bcrypt code

Example:

```go
// Try Argon2 verification first
match, err := crypto.VerifyPassword(password, user.PasswordHash)
if err == nil && match {
    return true
}

// Fallback to bcrypt for legacy hashes
if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) == nil {
    // Rehash with Argon2
    newHash, _ := crypto.HashPassword(password, params)
    user.PasswordHash = newHash
    // Update in database
    return true
}

return false
```

## References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Argon2 RFC 9106](https://www.rfc-editor.org/rfc/rfc9106.html)
- [Go crypto/argon2 package](https://pkg.go.dev/golang.org/x/crypto/argon2)
