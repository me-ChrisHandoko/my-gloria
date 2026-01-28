// Package i18n - Message keys for translations
package i18n

// Message keys - Use these constants instead of string literals
// This provides type safety and makes refactoring easier
const (
	// ============================================================
	// Authentication Messages
	// ============================================================
	MsgAuthEmailNotRegistered    = "auth.email.not_registered"
	MsgAuthAccountInactive       = "auth.account.inactive"
	MsgAuthEmailAlreadyExists    = "auth.email.already_exists"
	MsgAuthCredentialsInvalid    = "auth.credentials.invalid"
	MsgAuthLoginSuccess          = "auth.login.success"
	MsgAuthLogoutSuccess         = "auth.logout.success"
	MsgAuthRegisterSuccess       = "auth.register.success"
	MsgAuthPasswordChanged       = "auth.password.changed"
	MsgAuthPasswordHashFailed    = "auth.password.hash_failed"
	MsgAuthTokenInvalid          = "auth.token.invalid"
	MsgAuthTokenExpired          = "auth.token.expired"
	MsgAuthTokenGenerateFailed   = "auth.token.generate_failed"
	MsgAuthRefreshSuccess        = "auth.refresh.success"
	MsgAuthRefreshFailed         = "auth.refresh.failed"
	MsgAuthOldPasswordIncorrect  = "auth.old_password.incorrect"
	MsgAuthPasswordResetSent     = "auth.password_reset.sent"
	MsgAuthPasswordResetSuccess  = "auth.password_reset.success"
	MsgAuthPasswordResetInvalid  = "auth.password_reset.invalid"
	MsgAuthPasswordResetExpired  = "auth.password_reset.expired"

	// ============================================================
	// Validation Messages
	// ============================================================
	MsgValidationRequired     = "validation.required"
	MsgValidationMinLength    = "validation.min_length"
	MsgValidationMaxLength    = "validation.max_length"
	MsgValidationInvalidEmail = "validation.invalid_email"
	MsgValidationInvalidJSON  = "validation.invalid_json"
	MsgValidationInvalidUUID  = "validation.invalid_uuid"

	// ============================================================
	// CRUD Operation Messages
	// ============================================================
	MsgCrudCreated       = "crud.created"
	MsgCrudUpdated       = "crud.updated"
	MsgCrudDeleted       = "crud.deleted"
	MsgCrudNotFound      = "crud.not_found"
	MsgCrudAlreadyExists = "crud.already_exists"
	MsgCrudCreateFailed  = "crud.create_failed"
	MsgCrudUpdateFailed  = "crud.update_failed"
	MsgCrudDeleteFailed  = "crud.delete_failed"
	MsgCrudFetchFailed   = "crud.fetch_failed"

	// ============================================================
	// User Messages
	// ============================================================
	MsgUserNotFound      = "user.not_found"
	MsgUserCreated       = "user.created"
	MsgUserUpdated       = "user.updated"
	MsgUserDeleted       = "user.deleted"
	MsgUserAlreadyExists = "user.already_exists"

	// ============================================================
	// Role Messages
	// ============================================================
	MsgRoleNotFound           = "role.not_found"
	MsgRoleCreated            = "role.created"
	MsgRoleUpdated            = "role.updated"
	MsgRoleDeleted            = "role.deleted"
	MsgRoleAssigned           = "role.assigned"
	MsgRoleRevoked            = "role.revoked"
	MsgRoleSystemCannotModify = "role.system_cannot_modify"

	// ============================================================
	// Permission Messages
	// ============================================================
	MsgPermissionNotFound  = "permission.not_found"
	MsgPermissionCreated   = "permission.created"
	MsgPermissionUpdated   = "permission.updated"
	MsgPermissionDeleted   = "permission.deleted"
	MsgPermissionAssigned  = "permission.assigned"
	MsgPermissionRevoked   = "permission.revoked"
	MsgPermissionDenied    = "permission.denied"
	MsgPermissionEscalation = "permission.escalation"

	// ============================================================
	// Module Messages
	// ============================================================
	MsgModuleNotFound  = "module.not_found"
	MsgModuleCreated   = "module.created"
	MsgModuleUpdated   = "module.updated"
	MsgModuleDeleted   = "module.deleted"
	MsgModuleAssigned  = "module.assigned"
	MsgModuleRevoked   = "module.revoked"

	// ============================================================
	// Organization Messages (School, Department, Position)
	// ============================================================
	MsgSchoolNotFound     = "school.not_found"
	MsgSchoolCreated      = "school.created"
	MsgSchoolUpdated      = "school.updated"
	MsgSchoolDeleted      = "school.deleted"
	MsgDepartmentNotFound = "department.not_found"
	MsgDepartmentCreated  = "department.created"
	MsgDepartmentUpdated  = "department.updated"
	MsgDepartmentDeleted  = "department.deleted"
	MsgPositionNotFound   = "position.not_found"
	MsgPositionCreated    = "position.created"
	MsgPositionUpdated    = "position.updated"
	MsgPositionDeleted    = "position.deleted"
	MsgPositionAssigned   = "position.assigned"
	MsgPositionRevoked    = "position.revoked"

	// ============================================================
	// Generic Error Messages
	// ============================================================
	MsgErrorInternal     = "error.internal"
	MsgErrorUnauthorized = "error.unauthorized"
	MsgErrorForbidden    = "error.forbidden"
	MsgErrorNotFound     = "error.not_found"
	MsgErrorBadRequest   = "error.bad_request"
	MsgErrorConflict     = "error.conflict"
)
