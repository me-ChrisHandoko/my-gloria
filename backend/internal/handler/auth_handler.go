package handler

import (
	"errors"
	"net/http"

	"backend/internal/domain"
	"backend/internal/middleware"
	"backend/internal/repository"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// ExchangeTokenRequest represents the request to exchange an API key for a JWT
type ExchangeTokenRequest struct {
	APIKey string `json:"api_key" binding:"required,min=20"`
}

// AuthHandler handles authentication-related HTTP requests
type AuthHandler struct {
	authService      service.AuthService
	auditService     service.AuditService
	employeeRepo     repository.EmployeeRepository
}

// NewAuthHandler creates a new auth handler instance
func NewAuthHandler(authService service.AuthService, auditService service.AuditService, employeeRepo repository.EmployeeRepository) *AuthHandler {
	return &AuthHandler{
		authService:  authService,
		auditService: auditService,
		employeeRepo: employeeRepo,
	}
}

// ExchangeToken exchanges an API key for a JWT token
// @Summary Exchange API Key for JWT
// @Description Exchange a valid API key for a JWT access token
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body ExchangeTokenRequest true "API Key"
// @Success 200 {object} Response{data=service.TokenResponse}
// @Failure 400 {object} Response
// @Failure 401 {object} Response
// @Failure 403 {object} Response
// @Router /public/auth/token [post]
func (h *AuthHandler) ExchangeToken(c *gin.Context) {
	var req ExchangeTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, "invalid request: "+err.Error())
		return
	}

	// Get client IP and user agent for validation and logging
	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	// Exchange API key for JWT
	tokenResp, err := h.authService.ExchangeAPIKeyForJWT(req.APIKey, clientIP)
	if err != nil {
		status := http.StatusUnauthorized
		message := "authentication failed"

		switch {
		case errors.Is(err, service.ErrAuthAPIKeyNotFound):
			message = "invalid api key"
		case errors.Is(err, service.ErrAuthAPIKeyInactive):
			message = "api key is inactive"
		case errors.Is(err, service.ErrAuthAPIKeyExpired):
			message = "api key has expired"
		case errors.Is(err, service.ErrAuthIPNotAllowed):
			status = http.StatusForbidden
			message = "ip address not allowed"
		case errors.Is(err, service.ErrAuthInvalidAPIKey):
			message = "invalid api key format"
		case errors.Is(err, service.ErrAuthUserNotFoundForKey):
			message = "user not found for api key"
		}

		// Log failed authentication attempt
		if h.auditService != nil {
			h.auditService.LogAuthEvent(
				"anonymous",
				nil,
				domain.AuditActionLogin,
				"token_exchange",
				"failed",
				map[string]interface{}{
					"error":      message,
					"api_key_prefix": maskAPIKey(req.APIKey),
				},
				&clientIP,
				&userAgent,
			)
		}

		ErrorResponse(c, status, message)
		return
	}

	// Log successful token exchange
	if h.auditService != nil {
		h.auditService.LogAuthEvent(
			"api_key",
			nil,
			domain.AuditActionLogin,
			"token_exchange",
			"success",
			map[string]interface{}{
				"token_type": "jwt",
				"expires_in": tokenResp.ExpiresIn,
			},
			&clientIP,
			&userAgent,
		)
	}

	SuccessResponse(c, http.StatusOK, "token generated successfully", tokenResp)
}

// maskAPIKey masks the API key for logging purposes
func maskAPIKey(apiKey string) string {
	if len(apiKey) < 10 {
		return "***"
	}
	return apiKey[:8] + "..." + apiKey[len(apiKey)-4:]
}

// RefreshTokenRequest represents the request to refresh a JWT token
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshToken refreshes an expired JWT token using a refresh token
// @Summary Refresh JWT Token
// @Description Refresh an expired JWT token using a valid refresh token
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body RefreshTokenRequest true "Refresh Token"
// @Success 200 {object} Response{data=service.TokenResponse}
// @Failure 400 {object} Response
// @Failure 401 {object} Response
// @Router /public/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, "invalid request: "+err.Error())
		return
	}

	tokenResp, err := h.authService.RefreshJWTToken(req.RefreshToken)
	if err != nil {
		ErrorResponse(c, http.StatusUnauthorized, err.Error())
		return
	}

	SuccessResponse(c, http.StatusOK, "token refreshed successfully", tokenResp)
}

// ValidateToken validates a JWT token and returns its claims
// @Summary Validate JWT Token
// @Description Validate a JWT token and return its claims (for debugging)
// @Tags Authentication
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} Response
// @Failure 401 {object} Response
// @Router /public/auth/validate [get]
func (h *AuthHandler) ValidateToken(c *gin.Context) {
	// This is a debug endpoint that can be used to validate tokens
	// In production, this might be restricted or removed
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		ErrorResponse(c, http.StatusUnauthorized, "no valid authentication")
		return
	}

	SuccessResponse(c, http.StatusOK, "token is valid", gin.H{
		"user_id":     authCtx.UserID,
		"api_key_id":  authCtx.APIKeyID,
		"nip":         authCtx.NIP,
		"auth_type":   authCtx.Type,
		"permissions": authCtx.Permissions,
	})
}

// ValidateEmail checks if an email is registered as an active employee
// @Summary Validate Email
// @Description Check if an email is registered as an active employee in the system
// @Tags Authentication
// @Accept json
// @Produce json
// @Param email query string true "Email address to validate"
// @Success 200 {object} Response{data=map[string]bool}
// @Failure 400 {object} Response
// @Failure 403 {object} Response
// @Failure 404 {object} Response
// @Router /public/auth/validate-email [get]
func (h *AuthHandler) ValidateEmail(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		ErrorResponse(c, http.StatusBadRequest, "email parameter is required")
		return
	}

	// Check if email exists in employee database and is active
	// Note: FindByEmail already filters by status_aktif = "Aktif"
	employee, err := h.employeeRepo.FindByEmail(email)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			// Email doesn't exist OR status is not "Aktif"
			ErrorResponse(c, http.StatusNotFound, "email tidak terdaftar sebagai karyawan aktif. Silakan hubungi HR jika Anda yakin email Anda terdaftar.")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "failed to validate email")
		return
	}

	// Email found and employee is active
	// ✅ SECURITY FIX: Don't expose NIP and nama to prevent information disclosure
	SuccessResponse(c, http.StatusOK, "email is valid", gin.H{
		"valid": true,
	})
}
