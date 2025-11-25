package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"backend/internal/domain"
	"backend/internal/middleware"
	"backend/internal/repository"
)

var (
	// Auth-specific errors - map from ApiKeyService errors for consistent error handling
	ErrAuthAPIKeyNotFound     = errors.New("api key not found")
	ErrAuthAPIKeyInactive     = errors.New("api key is inactive")
	ErrAuthAPIKeyExpired      = errors.New("api key has expired")
	ErrAuthIPNotAllowed       = errors.New("ip address not allowed")
	ErrAuthInvalidAPIKey      = errors.New("invalid api key")
	ErrAuthRateLimitExceeded  = errors.New("rate limit exceeded")
	ErrAuthUserNotFoundForKey = errors.New("user not found for api key")
)

// TokenResponse represents the response for token generation
type TokenResponse struct {
	AccessToken  string    `json:"access_token"`
	TokenType    string    `json:"token_type"`
	ExpiresIn    int       `json:"expires_in"`
	ExpiresAt    time.Time `json:"expires_at"`
	RefreshToken string    `json:"refresh_token,omitempty"`
}

// AuthService defines the interface for authentication operations
type AuthService interface {
	// JWT operations
	ExchangeAPIKeyForJWT(plainKey string, clientIP string) (*TokenResponse, error)
	GenerateJWTForAPIKey(apiKey *domain.ApiKey) (*TokenResponse, error)
	RefreshJWTToken(refreshToken string) (*TokenResponse, error)

	// User lookup for middleware
	GetUserProfileInfoByClerkID(clerkUserID string) (*middleware.UserProfileInfo, error)
}

// authService implements AuthService
// Uses ApiKeyService for API key validation to avoid code duplication
type authService struct {
	apiKeyService   ApiKeyService
	userProfileRepo repository.UserProfileRepository
	permissionRepo  repository.PermissionRepository
	jwtConfig       *middleware.JWTConfig
}

// NewAuthService creates a new auth service instance
// Now depends on ApiKeyService for key validation instead of direct repository access
func NewAuthService(
	apiKeyService ApiKeyService,
	userProfileRepo repository.UserProfileRepository,
	permissionRepo repository.PermissionRepository,
	jwtConfig *middleware.JWTConfig,
) AuthService {
	return &authService{
		apiKeyService:   apiKeyService,
		userProfileRepo: userProfileRepo,
		permissionRepo:  permissionRepo,
		jwtConfig:       jwtConfig,
	}
}

// ExchangeAPIKeyForJWT exchanges an API key for a JWT token
// Uses ApiKeyService for validation to avoid code duplication
func (s *authService) ExchangeAPIKeyForJWT(plainKey string, clientIP string) (*TokenResponse, error) {
	// Validate the API key with IP check using ApiKeyService
	apiKey, err := s.apiKeyService.ValidateKey(plainKey, clientIP)
	if err != nil {
		// Map ApiKeyService errors to AuthService errors for consistent error handling
		switch err {
		case ErrApiKeyNotFound:
			return nil, ErrAuthAPIKeyNotFound
		case ErrApiKeyInactive:
			return nil, ErrAuthAPIKeyInactive
		case ErrApiKeyExpired:
			return nil, ErrAuthAPIKeyExpired
		case ErrIPNotAllowed:
			return nil, ErrAuthIPNotAllowed
		case ErrInvalidApiKey:
			return nil, ErrAuthInvalidAPIKey
		default:
			return nil, err
		}
	}

	// Update usage tracking
	if err := s.apiKeyService.RecordUsage(apiKey.ID, clientIP); err != nil {
		// Log error but don't fail the request
		fmt.Printf("Warning: Failed to record API key usage: %v\n", err)
	}

	// Generate JWT
	return s.GenerateJWTForAPIKey(apiKey)
}

// GenerateJWTForAPIKey generates a JWT token for an API key
func (s *authService) GenerateJWTForAPIKey(apiKey *domain.ApiKey) (*TokenResponse, error) {
	// Get user profile for the API key owner
	userProfile, err := s.userProfileRepo.FindByID(apiKey.UserID)
	if err != nil {
		return nil, ErrAuthUserNotFoundForKey
	}

	// Extract permissions from API key (stored as JSON)
	permissions := extractPermissionsFromAPIKey(apiKey)

	// Generate JWT
	token, expiresAt, err := middleware.GenerateJWT(
		userProfile.ID,
		apiKey.ID,
		userProfile.NIP,
		permissions,
		s.jwtConfig,
	)
	if err != nil {
		return nil, err
	}

	// Generate refresh token
	refreshToken, _, err := middleware.GenerateRefreshToken(userProfile.ID, apiKey.ID, s.jwtConfig)
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken:  token,
		TokenType:    "Bearer",
		ExpiresIn:    s.jwtConfig.ExpiryHours * 3600,
		ExpiresAt:    expiresAt,
		RefreshToken: refreshToken,
	}, nil
}

// GetUserProfileInfoByClerkID retrieves user profile info for Clerk middleware
// Uses GetUserAllPermissions to properly load hierarchy-based permissions
func (s *authService) GetUserProfileInfoByClerkID(clerkUserID string) (*middleware.UserProfileInfo, error) {
	profile, err := s.userProfileRepo.FindByClerkUserID(clerkUserID)
	if err != nil {
		return nil, err
	}

	// Load roles for the user (for role codes only, not permissions)
	profileWithDetails, err := s.userProfileRepo.FindWithFullDetails(profile.ID)
	if err != nil {
		return nil, err
	}

	// Extract role codes
	roles := make([]string, 0)
	for _, ur := range profileWithDetails.UserRoles {
		if ur.IsActive && ur.Role != nil {
			roles = append(roles, ur.Role.Code)
		}
	}

	// Use GetUserAllPermissions which properly handles role hierarchy
	// This includes: direct permissions + role permissions + inherited role permissions
	allPermissions, err := s.permissionRepo.GetUserAllPermissions(profile.ID)
	if err != nil {
		return nil, err
	}

	// Convert permissions to codes
	permissions := make([]string, 0, len(allPermissions))
	for _, p := range allPermissions {
		permissions = append(permissions, p.Code)
	}

	return &middleware.UserProfileInfo{
		ID:          profile.ID,
		ClerkUserID: profile.ClerkUserID,
		NIP:         profile.NIP,
		IsActive:    profile.IsActive,
		Permissions: permissions,
		Roles:       roles,
	}, nil
}

// RefreshJWTToken refreshes an expired JWT token using a valid refresh token
// Uses GetUserAllPermissions to properly load hierarchy-based permissions
func (s *authService) RefreshJWTToken(refreshToken string) (*TokenResponse, error) {
	// Validate the refresh token and extract user ID
	userID, err := middleware.ValidateRefreshToken(refreshToken, s.jwtConfig)
	if err != nil {
		if errors.Is(err, middleware.ErrExpiredToken) {
			return nil, errors.New("refresh token has expired")
		}
		return nil, errors.New("invalid refresh token")
	}

	// Get user profile to retrieve permissions
	userProfile, err := s.userProfileRepo.FindByID(userID)
	if err != nil {
		return nil, ErrAuthUserNotFoundForKey
	}

	// Check if user is still active
	if !userProfile.IsActive {
		return nil, errors.New("user account is inactive")
	}

	// Use GetUserAllPermissions which properly handles role hierarchy
	// This includes: direct permissions + role permissions + inherited role permissions
	allPermissions, err := s.permissionRepo.GetUserAllPermissions(userID)
	if err != nil {
		return nil, err
	}

	permissions := make([]string, 0, len(allPermissions))
	for _, p := range allPermissions {
		permissions = append(permissions, p.Code)
	}

	// Generate new access token
	token, expiresAt, err := middleware.GenerateJWT(
		userProfile.ID,
		"", // No API key ID for refreshed tokens
		userProfile.NIP,
		permissions,
		s.jwtConfig,
	)
	if err != nil {
		return nil, err
	}

	// Generate new refresh token
	newRefreshToken, _, err := middleware.GenerateRefreshToken(userProfile.ID, "", s.jwtConfig)
	if err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken:  token,
		TokenType:    "Bearer",
		ExpiresIn:    s.jwtConfig.ExpiryHours * 3600,
		ExpiresAt:    expiresAt,
		RefreshToken: newRefreshToken,
	}, nil
}

// Helper functions

// extractPermissionsFromAPIKey parses permissions from API key JSON field
func extractPermissionsFromAPIKey(apiKey *domain.ApiKey) []string {
	if apiKey.Permissions == nil {
		return []string{}
	}

	// Parse JSON permissions
	// The permissions field is datatypes.JSON, we need to unmarshal it into a slice
	var permissions []string
	if err := json.Unmarshal([]byte(*apiKey.Permissions), &permissions); err != nil {
		// Try parsing as a single string if array fails
		var singlePerm string
		if err := json.Unmarshal([]byte(*apiKey.Permissions), &singlePerm); err == nil && singlePerm != "" {
			return []string{singlePerm}
		}
		return []string{}
	}

	return permissions
}
