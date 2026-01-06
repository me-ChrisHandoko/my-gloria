package crypto

// ParamsFromConfig creates Argon2Params from configuration values
// This allows easy integration with the application configuration system
func ParamsFromConfig(memory, iterations uint32, parallelism uint8, saltLength, keyLength uint32) *Argon2Params {
	return &Argon2Params{
		Memory:      memory,
		Iterations:  iterations,
		Parallelism: parallelism,
		SaltLength:  saltLength,
		KeyLength:   keyLength,
	}
}

// ProductionParams returns recommended parameters for production environments
// Based on OWASP recommendations for high-security applications
func ProductionParams() *Argon2Params {
	return &Argon2Params{
		Memory:      131072, // 128 MiB
		Iterations:  4,      // 4 iterations
		Parallelism: 4,      // 4 threads
		SaltLength:  16,     // 16 bytes
		KeyLength:   32,     // 32 bytes
	}
}

// DevelopmentParams returns lighter parameters suitable for development
// These reduce hashing time while maintaining security for testing
func DevelopmentParams() *Argon2Params {
	return &Argon2Params{
		Memory:      65536, // 64 MiB
		Iterations:  3,     // 3 iterations
		Parallelism: 2,     // 2 threads
		SaltLength:  16,    // 16 bytes
		KeyLength:   32,    // 32 bytes
	}
}
