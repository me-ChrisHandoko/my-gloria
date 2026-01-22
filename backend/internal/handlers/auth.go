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
		c.JSON(http.StatusForbidden, gin.H{"error": "Email tidak terdaftar sebagai karyawan"})
		return
	}

	// Check if employee is active using existing helper method
	if !employee.IsActiveEmployee() {
		// Employee exists but status not active
		c.JSON(http.StatusForbidden, gin.H{"error": "Akun karyawan tidak aktif"})
		return
	}

	// Check email uniqueness in users table (prevent double registration)
	var existingUser models.User
	if err := db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email sudah terdaftar"})
		return
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	// Generate tokens
	accessToken, err := auth.GenerateAccessToken(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	refreshToken, refreshHash, err := auth.GenerateRefreshToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store refresh token"})
		return
	}

	// Preload DataKaryawan for user (only active employees)
	if err := db.Preload("DataKaryawan", "status_aktif = ?", "Aktif").First(&user, "id = ?", user.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user data"})
		return
	}

	// Generate CSRF token for this user session
	csrfToken, err := auth.GenerateCSRFToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate CSRF token"})
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
	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration successful",
		"user":    user.ToUserInfo(),
	})
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": auth.ErrInvalidCredentials})
		return
	}

	// Check if account is locked
	if user.LockedUntil != nil && time.Now().Before(*user.LockedUntil) {
		logAttempt(false, "account_locked")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":        auth.ErrAccountLocked,
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": auth.ErrAccountInactive})
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": auth.ErrInvalidCredentials})
		return
	}

	// Check employee status in data_karyawan table
	var employee models.DataKaryawan
	if err := db.Where("email = ?", user.Email).First(&employee).Error; err == nil {
		// Employee record exists, check if active
		if !employee.IsActiveEmployee() {
			logAttempt(false, "employee_inactive")
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Akun karyawan Anda sudah tidak aktif. Silakan hubungi administrator.",
			})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	refreshToken, refreshHash, err := auth.GenerateRefreshToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store refresh token"})
		return
	}

	// Log successful attempt
	logAttempt(true, "")

	// Debug: Log user email before preload
	println("DEBUG: Loading DataKaryawan for user email:", user.Email)

	// Preload DataKaryawan for user (only active employees)
	if err := db.Preload("DataKaryawan", "status_aktif = ?", "Aktif").First(&user, "id = ?", user.ID).Error; err != nil {
		println("DEBUG: Failed to preload user:", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load user data"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate CSRF token"})
		return
	}

	// Set httpOnly cookies (tokens ONLY in cookies, NOT in response body)
	isProduction := gin.Mode() == gin.ReleaseMode
	helpers.SetAuthCookies(c, accessToken, refreshToken, isProduction)
	helpers.SetCSRFCookie(c, csrfToken, isProduction)

	// Return success with user info only (NO TOKENS in body for security)
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user":    user.ToUserInfo(),
	})
}

// RefreshToken handles token refresh with rotation (security best practice)
func RefreshToken(c *gin.Context) {
	// Get refresh token from httpOnly cookie (secure)
	refreshTokenFromCookie, err := c.Cookie("gloria_refresh_token")
	if err != nil || refreshTokenFromCookie == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "refresh token required"})
		return
	}

	db := database.GetDB()

	// Find refresh token (need to check hash)
	var refreshTokens []models.RefreshToken
	if err := db.Where("expires_at > ?", time.Now()).
		Preload("User").
		Find(&refreshTokens).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": auth.ErrTokenInvalid})
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": auth.ErrTokenInvalid})
		return
	}

	// Check if already revoked (potential token reuse attack)
	if oldRT.RevokedAt != nil {
		// WARNING: Refresh token reuse detected - possible stolen token
		// Best practice: Revoke ALL tokens for this user
		db.Model(&models.RefreshToken{}).
			Where("user_id = ?", oldRT.User.ID).
			Update("revoked_at", time.Now())

		c.JSON(http.StatusUnauthorized, gin.H{"error": "token reuse detected - all sessions revoked for security"})
		return
	}

	// Check expiry
	if time.Now().After(oldRT.ExpiresAt) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": auth.ErrTokenExpired})
		return
	}

	// Check user is active
	if !oldRT.User.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": auth.ErrAccountInactive})
		return
	}

	// TOKEN ROTATION: Start transaction for atomic operation
	tx := db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start transaction"})
		return
	}

	// Revoke old refresh token (prevent reuse)
	now := time.Now()
	oldRT.RevokedAt = &now
	oldRT.LastUsedAt = &now
	if err := tx.Save(oldRT).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke old token"})
		return
	}

	// Generate new access token
	accessToken, err := auth.GenerateAccessToken(oldRT.User.ID, oldRT.User.Email)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate access token"})
		return
	}

	// Generate new refresh token (rotation)
	newRefreshToken, newRefreshHash, err := auth.GenerateRefreshToken()
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate new refresh token"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store new refresh token"})
		return
	}

	// Rotate CSRF token (security best practice)
	csrfToken, err := auth.GenerateCSRFToken(oldRT.User.ID)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate CSRF token"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit transaction"})
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
	c.JSON(http.StatusOK, gin.H{
		"message": "Token refreshed successfully",
	})
}

// ChangePassword handles password change
func ChangePassword(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()

	// Get user
	var user models.User
	if err := db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Verify current password
	if !auth.VerifyPassword(req.CurrentPassword, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "current password is incorrect"})
		return
	}

	// Hash new password
	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	// Update password
	now := time.Now()
	user.PasswordHash = newHash
	user.LastPasswordChange = &now

	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update password"})
		return
	}

	// Revoke all refresh tokens (force re-login)
	if err := db.Model(&models.RefreshToken{}).
		Where("user_id = ?", userID).
		Update("revoked_at", time.Now()).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "password changed successfully, but failed to revoke tokens",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "password changed successfully.",
	})
}

// GetMe returns current user information
func GetMe(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	db := database.GetDB()

	var user models.User
	if err := db.Preload("UserRoles.Role").
		Preload("UserPositions.Position").
		Preload("DataKaryawan", "status_aktif = ?", "Aktif").
		First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user.ToUserInfo())
}

// Logout revokes refresh token
func Logout(c *gin.Context) {
	// Get refresh token from httpOnly cookie (secure)
	refreshTokenFromCookie, err := c.Cookie("gloria_refresh_token")
	if err != nil || refreshTokenFromCookie == "" {
		// Even if no cookie, still clear cookies for logout
		helpers.ClearAuthCookies(c)
		c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
		return
	}

	db := database.GetDB()

	// Find and revoke refresh token
	var refreshTokens []models.RefreshToken
	if err := db.Find(&refreshTokens).Error; err != nil {
		// Clear cookies even if DB query fails
		helpers.ClearAuthCookies(c)
		c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
		return
	}

	for i := range refreshTokens {
		if auth.VerifyPassword(refreshTokenFromCookie, refreshTokens[i].TokenHash) {
			now := time.Now()
			refreshTokens[i].RevokedAt = &now
			db.Save(&refreshTokens[i])

			// Clear httpOnly cookies
			helpers.ClearAuthCookies(c)

			c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
			return
		}
	}

	// Even if token not found in DB, still clear cookies (client-side logout)
	helpers.ClearAuthCookies(c)

	c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()

	// Find user by email
	var user models.User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Don't reveal if email exists or not for security
		c.JSON(http.StatusOK, gin.H{"message": "If the email exists, a password reset link has been sent"})
		return
	}

	// Check if user is active
	if !user.IsActive {
		c.JSON(http.StatusOK, gin.H{"message": "If the email exists, a password reset link has been sent"})
		return
	}

	// Generate reset token
	resetToken, err := generateResetToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate reset token"})
		return
	}

	// Hash the token before storing
	tokenHash, err := auth.HashPassword(resetToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash token"})
		return
	}

	// Set expiry to 1 hour from now
	expiresAt := time.Now().Add(1 * time.Hour)

	// Update user with reset token
	user.PasswordResetToken = &tokenHash
	user.PasswordResetExpiresAt = &expiresAt

	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save reset token"})
		return
	}

	// Send email with reset token (not hash)
	emailSender := email.NewEmailSender()
	if err := emailSender.SendPasswordResetEmail(user.Email, resetToken); err != nil {
		// Log error but don't reveal to user
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "If the email exists, a password reset link has been sent"})
}

// ResetPassword handles password reset with token
func ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()

	// Find user with non-expired reset token
	var users []models.User
	if err := db.Where("password_reset_token IS NOT NULL AND password_reset_expires_at > ?", time.Now()).Find(&users).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	// Hash new password
	hashedPassword, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password has been reset successfully"})
}
