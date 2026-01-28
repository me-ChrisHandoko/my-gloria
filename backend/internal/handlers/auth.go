package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"strings"
	"time"

	"backend/internal/auth"
	"backend/internal/database"
	"backend/internal/email"
	"backend/internal/helpers"
	"backend/internal/i18n"
	"backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Register handles user registration
func Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()

	// Validate email exists in active employee database
	var employee models.DataKaryawan
	if err := db.Where("email = ?", req.Email).First(&employee).Error; err != nil {
		// Email not found in employee database
		helpers.Forbidden(c, i18n.MsgAuthEmailNotRegistered)
		return
	}

	// Check if employee is active using existing helper method
	if !employee.IsActiveEmployee() {
		// Employee exists but status not active
		helpers.Forbidden(c, i18n.MsgAuthAccountInactive)
		return
	}

	// Check email uniqueness in users table (prevent double registration)
	var existingUser models.User
	if err := db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		helpers.BadRequest(c, i18n.MsgAuthEmailAlreadyExists)
		return
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		helpers.InternalError(c, i18n.MsgAuthPasswordHashFailed)
		return
	}

	// Extract username from email (part before @)
	username := req.Email
	if atIndex := strings.Index(req.Email, "@"); atIndex > 0 {
		username = req.Email[:atIndex]
	}

	// Create user
	user := models.User{
		ID:           uuid.New().String(),
		Email:        req.Email,
		Username:     &username,
		PasswordHash: hashedPassword,
		IsActive:     true,
	}

	if err := db.Create(&user).Error; err != nil {
		helpers.InternalError(c, i18n.MsgCrudCreateFailed)
		return
	}

	// Generate tokens
	accessToken, err := auth.GenerateAccessToken(user.ID, user.Email)
	if err != nil {
		helpers.InternalError(c, i18n.MsgAuthTokenGenerateFailed)
		return
	}

	refreshToken, refreshHash, err := auth.GenerateRefreshToken()
	if err != nil {
		helpers.InternalError(c, i18n.MsgAuthTokenGenerateFailed)
		return
	}

	// Store refresh token
	ipAddress := c.ClientIP()
	userAgent := c.Request.UserAgent()
	rt := models.RefreshToken{
		ID:            uuid.New().String(),
		UserID: user.ID,
		TokenHash:     refreshHash,
		ExpiresAt:     time.Now().Add(auth.RefreshTokenExpiry),
		IPAddress:     &ipAddress,
		UserAgent:     &userAgent,
	}

	if err := db.Create(&rt).Error; err != nil {
		helpers.InternalError(c, i18n.MsgAuthTokenGenerateFailed)
		return
	}

	// Preload DataKaryawan for user (only active employees)
	if err := db.Preload("DataKaryawan", "status_aktif = ?", "Aktif").First(&user, "id = ?", user.ID).Error; err != nil {
		helpers.InternalError(c, i18n.MsgCrudFetchFailed)
		return
	}

	// Generate CSRF token for this user session
	csrfToken, err := auth.GenerateCSRFToken(user.ID)
	if err != nil {
		helpers.InternalError(c, i18n.MsgAuthTokenGenerateFailed)
		return
	}

	// Set httpOnly cookies (tokens ONLY in cookies, NOT in response body)
	isProduction := gin.Mode() == gin.ReleaseMode
	helpers.SetAuthCookies(c, accessToken, refreshToken, isProduction)
	helpers.SetCSRFCookie(c, csrfToken, isProduction)

	// Send welcome email (async - don't block response)
	go func() {
		emailSender := email.NewEmailSender()
		// Get display name from employee data or use username
		displayName := username
		if employee.Nama != nil && *employee.Nama != "" {
			displayName = *employee.Nama
		}
		if err := emailSender.SendWelcomeEmail(req.Email, displayName); err != nil {
			log.Printf("[WELCOME_EMAIL_ERROR] Failed to send welcome email to %s: %v", req.Email, err)
		} else {
			log.Printf("[WELCOME_EMAIL] Successfully sent welcome email to %s", req.Email)
		}
	}()

	// Return success with user info only (NO TOKENS in body for security)
	helpers.SuccessResponse(c, http.StatusCreated, i18n.MsgAuthRegisterSuccess, user.ToUserInfo())
}

// Login handles user authentication
func Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()
	ipAddress := c.ClientIP()
	userAgent := c.Request.UserAgent()

	// Helper function to log login attempt
	logAttempt := func(success bool, failureReason string) {
		attempt := models.LoginAttempt{
			ID:        uuid.New().String(),
			Email:     req.Email,
			IPAddress: ipAddress,
			UserAgent: &userAgent,
			Success:   success,
		}
		if !success {
			attempt.FailureReason = &failureReason
		}
		db.Create(&attempt)
	}

	// Find user
	var user models.User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		logAttempt(false, "invalid_credentials")
		helpers.Unauthorized(c, i18n.MsgAuthCredentialsInvalid)
		return
	}

	// Check if account is locked
	if user.LockedUntil != nil && time.Now().Before(*user.LockedUntil) {
		logAttempt(false, "account_locked")
		helpers.ErrorResponseWithDetails(c, http.StatusUnauthorized, i18n.MsgAuthAccountInactive, gin.H{
			"locked_until": user.LockedUntil,
		})
		return
	}

	// Reset lock if expired
	if user.LockedUntil != nil && time.Now().After(*user.LockedUntil) {
		user.FailedLoginAttempts = 0
		user.LockedUntil = nil
	}

	// Check if account is active
	if !user.IsActive {
		logAttempt(false, "account_inactive")
		helpers.Unauthorized(c, i18n.MsgAuthAccountInactive)
		return
	}

	// Verify password
	if !auth.VerifyPassword(req.Password, user.PasswordHash) {
		// Increment failed attempts
		user.FailedLoginAttempts++

		// Lock account if threshold reached
		if user.FailedLoginAttempts >= auth.MaxFailedAttempts {
			lockUntil := time.Now().Add(auth.AccountLockDuration)
			user.LockedUntil = &lockUntil
		}

		db.Save(&user)
		logAttempt(false, "invalid_credentials")
		helpers.Unauthorized(c, i18n.MsgAuthCredentialsInvalid)
		return
	}

	// Check employee status in data_karyawan table
	var employee models.DataKaryawan
	if err := db.Where("email = ?", user.Email).First(&employee).Error; err == nil {
		// Employee record exists, check if active
		if !employee.IsActiveEmployee() {
			logAttempt(false, "employee_inactive")
			helpers.Forbidden(c, i18n.MsgAuthAccountInactive)
			return
		}
	}
	// If employee record not found, continue (allow non-employee users to login)

	// Reset failed attempts on successful login
	user.FailedLoginAttempts = 0
	user.LockedUntil = nil
	now := time.Now()
	user.LastActive = &now
	db.Save(&user)

	// Generate tokens
	accessToken, err := auth.GenerateAccessToken(user.ID, user.Email)
	if err != nil {
		helpers.InternalError(c, i18n.MsgAuthTokenGenerateFailed)
		return
	}

	refreshToken, refreshHash, err := auth.GenerateRefreshToken()
	if err != nil {
		helpers.InternalError(c, i18n.MsgAuthTokenGenerateFailed)
		return
	}

	// Store refresh token
	rt := models.RefreshToken{
		ID:            uuid.New().String(),
		UserID: user.ID,
		TokenHash:     refreshHash,
		ExpiresAt:     time.Now().Add(auth.RefreshTokenExpiry),
		IPAddress:     &ipAddress,
		UserAgent:     &userAgent,
	}

	if err := db.Create(&rt).Error; err != nil {
		helpers.InternalError(c, i18n.MsgAuthTokenGenerateFailed)
		return
	}

	// Log successful attempt
	logAttempt(true, "")

	// Debug: Log user email before preload
	println("DEBUG: Loading DataKaryawan for user email:", user.Email)

	// Preload DataKaryawan for user (only active employees)
	if err := db.Preload("DataKaryawan", "status_aktif = ?", "Aktif").First(&user, "id = ?", user.ID).Error; err != nil {
		println("DEBUG: Failed to preload user:", err.Error())
		helpers.InternalError(c, i18n.MsgCrudFetchFailed)
		return
	}

	// Debug: Check if DataKaryawan loaded
	if user.DataKaryawan != nil {
		println("DEBUG: DataKaryawan loaded successfully - NIP:", user.DataKaryawan.NIP)
		if user.DataKaryawan.Nama != nil {
			println("DEBUG: DataKaryawan Nama:", *user.DataKaryawan.Nama)
		} else {
			println("DEBUG: DataKaryawan Nama is nil")
		}
	} else {
		println("DEBUG: DataKaryawan is nil - no matching email in data_karyawan table")
	}

	// Generate CSRF token for this user session
	csrfToken, err := auth.GenerateCSRFToken(user.ID)
	if err != nil {
		helpers.InternalError(c, i18n.MsgAuthTokenGenerateFailed)
		return
	}

	// Set httpOnly cookies (tokens ONLY in cookies, NOT in response body)
	isProduction := gin.Mode() == gin.ReleaseMode
	helpers.SetAuthCookies(c, accessToken, refreshToken, isProduction)
	helpers.SetCSRFCookie(c, csrfToken, isProduction)

	// Return success with user info only (NO TOKENS in body for security)
	helpers.SuccessResponse(c, http.StatusOK, i18n.MsgAuthLoginSuccess, user.ToUserInfo())
}

// RefreshToken handles token refresh with rotation (security best practice)
func RefreshToken(c *gin.Context) {
	// Get refresh token from httpOnly cookie (secure)
	refreshTokenFromCookie, err := c.Cookie("gloria_refresh_token")
	if err != nil || refreshTokenFromCookie == "" {
		helpers.Unauthorized(c, i18n.MsgAuthTokenInvalid)
		return
	}

	db := database.GetDB()

	// Find refresh token (need to check hash)
	var refreshTokens []models.RefreshToken
	if err := db.Where("expires_at > ?", time.Now()).
		Preload("User").
		Find(&refreshTokens).Error; err != nil {
		helpers.Unauthorized(c, i18n.MsgAuthTokenInvalid)
		return
	}

	var oldRT *models.RefreshToken
	for i := range refreshTokens {
		if auth.VerifyPassword(refreshTokenFromCookie, refreshTokens[i].TokenHash) {
			oldRT = &refreshTokens[i]
			break
		}
	}

	if oldRT == nil {
		helpers.Unauthorized(c, i18n.MsgAuthTokenInvalid)
		return
	}

	// Check if already revoked (potential token reuse attack)
	if oldRT.RevokedAt != nil {
		// WARNING: Refresh token reuse detected - possible stolen token
		// Best practice: Revoke ALL tokens for this user
		db.Model(&models.RefreshToken{}).
			Where("user_id = ?", oldRT.User.ID).
			Update("revoked_at", time.Now())

		helpers.Unauthorized(c, i18n.MsgAuthTokenInvalid)
		return
	}

	// Check expiry
	if time.Now().After(oldRT.ExpiresAt) {
		helpers.Unauthorized(c, i18n.MsgAuthTokenExpired)
		return
	}

	// Check user is active
	if !oldRT.User.IsActive {
		helpers.Unauthorized(c, i18n.MsgAuthAccountInactive)
		return
	}

	// TOKEN ROTATION: Start transaction for atomic operation
	tx := db.Begin()
	if tx.Error != nil {
		helpers.InternalError(c, i18n.MsgErrorInternal)
		return
	}

	// Revoke old refresh token (prevent reuse)
	now := time.Now()
	oldRT.RevokedAt = &now
	oldRT.LastUsedAt = &now
	if err := tx.Save(oldRT).Error; err != nil {
		tx.Rollback()
		helpers.InternalError(c, i18n.MsgAuthRefreshFailed)
		return
	}

	// Generate new access token
	accessToken, err := auth.GenerateAccessToken(oldRT.User.ID, oldRT.User.Email)
	if err != nil {
		tx.Rollback()
		helpers.InternalError(c, i18n.MsgAuthTokenGenerateFailed)
		return
	}

	// Generate new refresh token (rotation)
	newRefreshToken, newRefreshHash, err := auth.GenerateRefreshToken()
	if err != nil {
		tx.Rollback()
		helpers.InternalError(c, i18n.MsgAuthTokenGenerateFailed)
		return
	}

	// Store new refresh token
	ipAddress := c.ClientIP()
	userAgent := c.Request.UserAgent()
	newRT := models.RefreshToken{
		ID:            uuid.New().String(),
		UserID: oldRT.User.ID,
		TokenHash:     newRefreshHash,
		ExpiresAt:     time.Now().Add(auth.RefreshTokenExpiry),
		IPAddress:     &ipAddress,
		UserAgent:     &userAgent,
	}

	if err := tx.Create(&newRT).Error; err != nil {
		tx.Rollback()
		helpers.InternalError(c, i18n.MsgAuthRefreshFailed)
		return
	}

	// Rotate CSRF token (security best practice)
	csrfToken, err := auth.GenerateCSRFToken(oldRT.User.ID)
	if err != nil {
		tx.Rollback()
		helpers.InternalError(c, i18n.MsgAuthTokenGenerateFailed)
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		helpers.InternalError(c, i18n.MsgErrorInternal)
		return
	}

	// Update cookies with new tokens (secure - httpOnly)
	isProduction := gin.Mode() == gin.ReleaseMode
	helpers.UpdateAccessTokenCookie(c, accessToken, isProduction)
	helpers.SetAuthCookies(c, accessToken, newRefreshToken, isProduction) // Update both tokens
	helpers.SetCSRFCookie(c, csrfToken, isProduction)

	// Log successful token rotation for audit
	log.Printf("[TOKEN_ROTATION] User: %s | Old Token: %s | New Token: %s | IP: %s",
		oldRT.User.Email, oldRT.ID, newRT.ID, ipAddress)

	// Return success only (NO TOKEN in body for security)
	helpers.MessageOnlyResponse(c, http.StatusOK, i18n.MsgAuthRefreshSuccess)
}

// ChangePassword handles password change
func ChangePassword(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		helpers.Unauthorized(c, i18n.MsgErrorUnauthorized)
		return
	}

	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helpers.BadRequest(c, i18n.MsgErrorBadRequest)
		return
	}

	db := database.GetDB()

	// Get user
	var user models.User
	if err := db.First(&user, "id = ?", userID).Error; err != nil {
		helpers.NotFound(c, i18n.MsgUserNotFound)
		return
	}

	// Verify current password
	if !auth.VerifyPassword(req.CurrentPassword, user.PasswordHash) {
		helpers.Unauthorized(c, i18n.MsgAuthOldPasswordIncorrect)
		return
	}

	// Hash new password
	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		helpers.InternalError(c, i18n.MsgAuthPasswordHashFailed)
		return
	}

	// Update password
	now := time.Now()
	user.PasswordHash = newHash
	user.LastPasswordChange = &now

	if err := db.Save(&user).Error; err != nil {
		helpers.InternalError(c, i18n.MsgCrudUpdateFailed)
		return
	}

	// Revoke all refresh tokens (force re-login)
	db.Model(&models.RefreshToken{}).
		Where("user_id = ?", userID).
		Update("revoked_at", time.Now())

	helpers.MessageOnlyResponse(c, http.StatusOK, i18n.MsgAuthPasswordChanged)
}

// GetMe returns current user information
func GetMe(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		helpers.Unauthorized(c, i18n.MsgErrorUnauthorized)
		return
	}

	db := database.GetDB()

	var user models.User
	if err := db.Preload("UserRoles.Role").
		Preload("UserPositions.Position").
		Preload("DataKaryawan", "status_aktif = ?", "Aktif").
		First(&user, "id = ?", userID).Error; err != nil {
		helpers.NotFound(c, i18n.MsgUserNotFound)
		return
	}

	helpers.DataResponse(c, http.StatusOK, user.ToUserInfo())
}

// Logout revokes refresh token
// This endpoint is public (no JWT required) to allow logout with expired tokens
// But we still validate CSRF when possible to prevent logout CSRF attacks
func Logout(c *gin.Context) {
	// Try to validate CSRF if we have an access token (even if expired)
	// This prevents logout CSRF attacks while allowing logout with expired JWT
	accessTokenFromCookie, _ := c.Cookie("gloria_access_token")
	if accessTokenFromCookie != "" {
		// Parse token without validation to get user_id (works even if expired)
		claims, err := auth.ParseTokenClaims(accessTokenFromCookie)
		if err == nil && claims.UserID != "" {
			// We have user_id, validate CSRF token
			csrfToken := c.GetHeader("X-CSRF-Token")
			if csrfToken == "" {
				c.JSON(http.StatusForbidden, gin.H{"error": "CSRF token is required"})
				return
			}
			if err := auth.ValidateCSRFToken(csrfToken, claims.UserID); err != nil {
				c.JSON(http.StatusForbidden, gin.H{"error": "CSRF validation failed"})
				return
			}
		}
	}

	// Get refresh token from httpOnly cookie (secure)
	refreshTokenFromCookie, err := c.Cookie("gloria_refresh_token")
	if err != nil || refreshTokenFromCookie == "" {
		// Even if no cookie, still clear cookies for logout
		helpers.ClearAuthCookies(c)
		helpers.MessageOnlyResponse(c, http.StatusOK, i18n.MsgAuthLogoutSuccess)
		return
	}

	db := database.GetDB()

	// Find and revoke refresh token
	var refreshTokens []models.RefreshToken
	if err := db.Find(&refreshTokens).Error; err != nil {
		// Clear cookies even if DB query fails
		helpers.ClearAuthCookies(c)
		helpers.MessageOnlyResponse(c, http.StatusOK, i18n.MsgAuthLogoutSuccess)
		return
	}

	for i := range refreshTokens {
		if auth.VerifyPassword(refreshTokenFromCookie, refreshTokens[i].TokenHash) {
			now := time.Now()
			refreshTokens[i].RevokedAt = &now
			db.Save(&refreshTokens[i])

			// Clear httpOnly cookies
			helpers.ClearAuthCookies(c)

			helpers.MessageOnlyResponse(c, http.StatusOK, i18n.MsgAuthLogoutSuccess)
			return
		}
	}

	// Even if token not found in DB, still clear cookies (client-side logout)
	helpers.ClearAuthCookies(c)

	helpers.MessageOnlyResponse(c, http.StatusOK, i18n.MsgAuthLogoutSuccess)
}

// ForgotPasswordRequest represents the request body for forgot password
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest represents the request body for reset password
type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8,max=100"`
}

// generateResetToken generates a secure random token
func generateResetToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// ForgotPassword handles forgot password request
func ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helpers.BadRequest(c, i18n.MsgErrorBadRequest)
		return
	}

	db := database.GetDB()

	// Find user by email
	var user models.User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Don't reveal if email exists or not for security
		helpers.MessageOnlyResponse(c, http.StatusOK, i18n.MsgAuthPasswordResetSent)
		return
	}

	// Check if user is active
	if !user.IsActive {
		helpers.MessageOnlyResponse(c, http.StatusOK, i18n.MsgAuthPasswordResetSent)
		return
	}

	// Generate reset token
	resetToken, err := generateResetToken()
	if err != nil {
		helpers.InternalError(c, i18n.MsgAuthTokenGenerateFailed)
		return
	}

	// Hash the token before storing
	tokenHash, err := auth.HashPassword(resetToken)
	if err != nil {
		helpers.InternalError(c, i18n.MsgAuthPasswordHashFailed)
		return
	}

	// Set expiry to 1 hour from now
	expiresAt := time.Now().Add(1 * time.Hour)

	// Update user with reset token
	user.PasswordResetToken = &tokenHash
	user.PasswordResetExpiresAt = &expiresAt

	if err := db.Save(&user).Error; err != nil {
		helpers.InternalError(c, i18n.MsgErrorInternal)
		return
	}

	// Send email with reset token (not hash)
	emailSender := email.NewEmailSender()
	if err := emailSender.SendPasswordResetEmail(user.Email, resetToken); err != nil {
		// Log error but don't reveal to user
		helpers.InternalError(c, i18n.MsgErrorInternal)
		return
	}

	helpers.MessageOnlyResponse(c, http.StatusOK, i18n.MsgAuthPasswordResetSent)
}

// ResetPassword handles password reset with token
func ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		helpers.BadRequest(c, i18n.MsgErrorBadRequest)
		return
	}

	db := database.GetDB()

	// Find user with non-expired reset token
	var users []models.User
	if err := db.Where("password_reset_token IS NOT NULL AND password_reset_expires_at > ?", time.Now()).Find(&users).Error; err != nil {
		helpers.BadRequest(c, i18n.MsgAuthPasswordResetInvalid)
		return
	}

	// Find user with matching token
	var targetUser *models.User
	for i := range users {
		if users[i].PasswordResetToken != nil && auth.VerifyPassword(req.Token, *users[i].PasswordResetToken) {
			targetUser = &users[i]
			break
		}
	}

	if targetUser == nil {
		helpers.BadRequest(c, i18n.MsgAuthPasswordResetExpired)
		return
	}

	// Hash new password
	hashedPassword, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		helpers.InternalError(c, i18n.MsgAuthPasswordHashFailed)
		return
	}

	// Update password and clear reset token
	now := time.Now()
	targetUser.PasswordHash = hashedPassword
	targetUser.PasswordResetToken = nil
	targetUser.PasswordResetExpiresAt = nil
	targetUser.LastPasswordChange = &now
	targetUser.FailedLoginAttempts = 0
	targetUser.LockedUntil = nil

	if err := db.Save(targetUser).Error; err != nil {
		helpers.InternalError(c, i18n.MsgCrudUpdateFailed)
		return
	}

	helpers.MessageOnlyResponse(c, http.StatusOK, i18n.MsgAuthPasswordResetSuccess)
}
