package models

// AuditAction represents the type of action performed in audit logs
type AuditAction string

const (
	AuditActionCreate   AuditAction = "CREATE"
	AuditActionRead     AuditAction = "READ"
	AuditActionUpdate   AuditAction = "UPDATE"
	AuditActionDelete   AuditAction = "DELETE"
	AuditActionApprove  AuditAction = "APPROVE"
	AuditActionReject   AuditAction = "REJECT"
	AuditActionLogin    AuditAction = "LOGIN"
	AuditActionLogout   AuditAction = "LOGOUT"
	AuditActionExport   AuditAction = "EXPORT"
	AuditActionImport   AuditAction = "IMPORT"
	AuditActionAssign   AuditAction = "ASSIGN"
	AuditActionGrant    AuditAction = "GRANT"
	AuditActionRevoke   AuditAction = "REVOKE"
	AuditActionDelegate AuditAction = "DELEGATE"
)

func (a AuditAction) IsValid() bool {
	switch a {
	case AuditActionCreate, AuditActionRead, AuditActionUpdate, AuditActionDelete,
		AuditActionApprove, AuditActionReject, AuditActionLogin, AuditActionLogout,
		AuditActionExport, AuditActionImport, AuditActionAssign, AuditActionGrant,
		AuditActionRevoke, AuditActionDelegate:
		return true
	}
	return false
}

func (a AuditAction) String() string {
	return string(a)
}

// AuditCategory represents the category of audit logs
type AuditCategory string

const (
	AuditCategoryPermission     AuditCategory = "PERMISSION"
	AuditCategoryModule         AuditCategory = "MODULE"
	AuditCategoryWorkflow       AuditCategory = "WORKFLOW"
	AuditCategorySystemConfig   AuditCategory = "SYSTEM_CONFIG"
	AuditCategoryUserManagement AuditCategory = "USER_MANAGEMENT"
	AuditCategoryDataChange     AuditCategory = "DATA_CHANGE"
	AuditCategorySecurity       AuditCategory = "SECURITY"
)

func (a AuditCategory) IsValid() bool {
	switch a {
	case AuditCategoryPermission, AuditCategoryModule, AuditCategoryWorkflow,
		AuditCategorySystemConfig, AuditCategoryUserManagement, AuditCategoryDataChange,
		AuditCategorySecurity:
		return true
	}
	return false
}

func (a AuditCategory) String() string {
	return string(a)
}

// DelegationType represents the type of delegation
type DelegationType string

const (
	DelegationTypeApproval   DelegationType = "APPROVAL"
	DelegationTypePermission DelegationType = "PERMISSION"
	DelegationTypeWorkflow   DelegationType = "WORKFLOW"
)

func (d DelegationType) IsValid() bool {
	switch d {
	case DelegationTypeApproval, DelegationTypePermission, DelegationTypeWorkflow:
		return true
	}
	return false
}

func (d DelegationType) String() string {
	return string(d)
}

// ModuleCategory represents the category of modules
type ModuleCategory string

const (
	ModuleCategoryService     ModuleCategory = "SERVICE"
	ModuleCategoryPerformance ModuleCategory = "PERFORMANCE"
	ModuleCategoryQuality     ModuleCategory = "QUALITY"
	ModuleCategoryFeedback    ModuleCategory = "FEEDBACK"
	ModuleCategoryTraining    ModuleCategory = "TRAINING"
	ModuleCategorySystem      ModuleCategory = "SYSTEM"
)

func (m ModuleCategory) IsValid() bool {
	switch m {
	case ModuleCategoryService, ModuleCategoryPerformance, ModuleCategoryQuality,
		ModuleCategoryFeedback, ModuleCategoryTraining, ModuleCategorySystem:
		return true
	}
	return false
}

func (m ModuleCategory) String() string {
	return string(m)
}

// PermissionAction represents the type of action for permissions
type PermissionAction string

const (
	PermissionActionCreate  PermissionAction = "CREATE"
	PermissionActionRead    PermissionAction = "READ"
	PermissionActionUpdate  PermissionAction = "UPDATE"
	PermissionActionDelete  PermissionAction = "DELETE"
	PermissionActionApprove PermissionAction = "APPROVE"
	PermissionActionExport  PermissionAction = "EXPORT"
	PermissionActionImport  PermissionAction = "IMPORT"
	PermissionActionPrint   PermissionAction = "PRINT"
	PermissionActionAssign  PermissionAction = "ASSIGN"
	PermissionActionClose   PermissionAction = "CLOSE"
)

func (p PermissionAction) IsValid() bool {
	switch p {
	case PermissionActionCreate, PermissionActionRead, PermissionActionUpdate,
		PermissionActionDelete, PermissionActionApprove, PermissionActionExport,
		PermissionActionImport, PermissionActionPrint, PermissionActionAssign,
		PermissionActionClose:
		return true
	}
	return false
}

func (p PermissionAction) String() string {
	return string(p)
}

// PermissionScope represents the scope of permissions
type PermissionScope string

const (
	PermissionScopeOwn        PermissionScope = "OWN"
	PermissionScopeDepartment PermissionScope = "DEPARTMENT"
	PermissionScopeSchool     PermissionScope = "SCHOOL"
	PermissionScopeAll        PermissionScope = "ALL"
)

func (p PermissionScope) IsValid() bool {
	switch p {
	case PermissionScopeOwn, PermissionScopeDepartment, PermissionScopeSchool, PermissionScopeAll:
		return true
	}
	return false
}

func (p PermissionScope) String() string {
	return string(p)
}

// Priority represents priority levels
type Priority string

const (
	PriorityLow      Priority = "LOW"
	PriorityMedium   Priority = "MEDIUM"
	PriorityHigh     Priority = "HIGH"
	PriorityUrgent   Priority = "URGENT"
	PriorityCritical Priority = "CRITICAL"
)

func (p Priority) IsValid() bool {
	switch p {
	case PriorityLow, PriorityMedium, PriorityHigh, PriorityUrgent, PriorityCritical:
		return true
	}
	return false
}

func (p Priority) String() string {
	return string(p)
}

// AllAuditActions returns all valid audit actions
func AllAuditActions() []AuditAction {
	return []AuditAction{
		AuditActionCreate, AuditActionRead, AuditActionUpdate, AuditActionDelete,
		AuditActionApprove, AuditActionReject, AuditActionLogin, AuditActionLogout,
		AuditActionExport, AuditActionImport, AuditActionAssign, AuditActionGrant,
		AuditActionRevoke, AuditActionDelegate,
	}
}

// AllAuditCategories returns all valid audit categories
func AllAuditCategories() []AuditCategory {
	return []AuditCategory{
		AuditCategoryPermission, AuditCategoryModule, AuditCategoryWorkflow,
		AuditCategorySystemConfig, AuditCategoryUserManagement, AuditCategoryDataChange,
		AuditCategorySecurity,
	}
}

// AllDelegationTypes returns all valid delegation types
func AllDelegationTypes() []DelegationType {
	return []DelegationType{
		DelegationTypeApproval, DelegationTypePermission, DelegationTypeWorkflow,
	}
}

// AllModuleCategories returns all valid module categories
func AllModuleCategories() []ModuleCategory {
	return []ModuleCategory{
		ModuleCategoryService, ModuleCategoryPerformance, ModuleCategoryQuality,
		ModuleCategoryFeedback, ModuleCategoryTraining, ModuleCategorySystem,
	}
}

// AllPermissionActions returns all valid permission actions
func AllPermissionActions() []PermissionAction {
	return []PermissionAction{
		PermissionActionCreate, PermissionActionRead, PermissionActionUpdate,
		PermissionActionDelete, PermissionActionApprove, PermissionActionExport,
		PermissionActionImport, PermissionActionPrint, PermissionActionAssign,
		PermissionActionClose,
	}
}

// AllPermissionScopes returns all valid permission scopes
func AllPermissionScopes() []PermissionScope {
	return []PermissionScope{
		PermissionScopeOwn, PermissionScopeDepartment, PermissionScopeSchool, PermissionScopeAll,
	}
}

// AllPriorities returns all valid priorities
func AllPriorities() []Priority {
	return []Priority{
		PriorityLow, PriorityMedium, PriorityHigh, PriorityUrgent, PriorityCritical,
	}
}
