// Package i18n - English translations
package i18n

// TranslationsEN contains all English translations
var TranslationsEN = map[string]string{
	// ============================================================
	// Authentication Messages
	// ============================================================
	"auth.email.not_registered":    "Email is not registered as an employee",
	"auth.account.inactive":        "Employee account is inactive",
	"auth.email.already_exists":    "Email is already registered",
	"auth.credentials.invalid":     "Invalid email or password",
	"auth.login.success":           "Login successful",
	"auth.logout.success":          "Logout successful",
	"auth.register.success":        "Registration successful",
	"auth.password.changed":        "Password changed successfully",
	"auth.password.hash_failed":    "Failed to hash password",
	"auth.token.invalid":           "Invalid token",
	"auth.token.expired":           "Token has expired",
	"auth.token.generate_failed":   "Failed to generate token",
	"auth.refresh.success":         "Token refreshed successfully",
	"auth.refresh.failed":          "Failed to refresh token",
	"auth.old_password.incorrect":  "Current password is incorrect",
	"auth.password_reset.sent":     "Password reset link has been sent to your email",
	"auth.password_reset.success":  "Password has been reset successfully",
	"auth.password_reset.invalid":  "Invalid password reset link",
	"auth.password_reset.expired":  "Password reset link has expired",

	// ============================================================
	// Validation Messages
	// ============================================================
	"validation.required":      "%s is required",
	"validation.min_length":    "%s must be at least %d characters",
	"validation.max_length":    "%s must not exceed %d characters",
	"validation.invalid_email": "Invalid email format",
	"validation.invalid_json":  "Invalid JSON format",
	"validation.invalid_uuid":  "Invalid ID format",

	// ============================================================
	// CRUD Operation Messages
	// ============================================================
	"crud.created":        "%s created successfully",
	"crud.updated":        "%s updated successfully",
	"crud.deleted":        "%s deleted successfully",
	"crud.not_found":      "%s not found",
	"crud.already_exists": "%s already exists",
	"crud.create_failed":  "Failed to create %s",
	"crud.update_failed":  "Failed to update %s",
	"crud.delete_failed":  "Failed to delete %s",
	"crud.fetch_failed":   "Failed to fetch %s",

	// ============================================================
	// User Messages
	// ============================================================
	"user.not_found":      "User not found",
	"user.created":        "User created successfully",
	"user.updated":        "User updated successfully",
	"user.deleted":        "User deleted successfully",
	"user.already_exists": "User already exists",

	// ============================================================
	// Role Messages
	// ============================================================
	"role.not_found":             "Role not found",
	"role.created":               "Role created successfully",
	"role.updated":               "Role updated successfully",
	"role.deleted":               "Role deleted successfully",
	"role.assigned":              "Role assigned successfully",
	"role.revoked":               "Role revoked successfully",
	"role.system_cannot_modify":  "System role cannot be modified",

	// ============================================================
	// Permission Messages
	// ============================================================
	"permission.not_found":  "Permission not found",
	"permission.created":    "Permission created successfully",
	"permission.updated":    "Permission updated successfully",
	"permission.deleted":    "Permission deleted successfully",
	"permission.assigned":   "Permission assigned successfully",
	"permission.revoked":    "Permission revoked successfully",
	"permission.denied":     "You do not have permission to perform this action",
	"permission.escalation": "Cannot grant permissions you do not have",

	// ============================================================
	// Module Messages
	// ============================================================
	"module.not_found": "Module not found",
	"module.created":   "Module created successfully",
	"module.updated":   "Module updated successfully",
	"module.deleted":   "Module deleted successfully",
	"module.assigned":  "Module access granted successfully",
	"module.revoked":   "Module access revoked successfully",

	// ============================================================
	// Organization Messages (School, Department, Position)
	// ============================================================
	"school.not_found":     "School not found",
	"school.created":       "School created successfully",
	"school.updated":       "School updated successfully",
	"school.deleted":       "School deleted successfully",
	"department.not_found": "Department not found",
	"department.created":   "Department created successfully",
	"department.updated":   "Department updated successfully",
	"department.deleted":   "Department deleted successfully",
	"position.not_found":   "Position not found",
	"position.created":     "Position created successfully",
	"position.updated":     "Position updated successfully",
	"position.deleted":     "Position deleted successfully",
	"position.assigned":    "Position assigned successfully",
	"position.revoked":     "Position revoked successfully",

	// ============================================================
	// Generic Error Messages
	// ============================================================
	"error.internal":     "Internal server error occurred",
	"error.unauthorized": "You are not logged in or session has expired",
	"error.forbidden":    "You do not have access",
	"error.not_found":    "Data not found",
	"error.bad_request":  "Invalid request",
	"error.conflict":     "Data already exists or conflict",
}
