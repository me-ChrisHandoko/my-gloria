package service

import (
	"backend/internal/repository"
)

// DashboardStatistics contains aggregated statistics for the dashboard
type DashboardStatistics struct {
	Employees    *repository.EmployeeStatistics `json:"employees"`
	Organization *OrganizationStatistics        `json:"organization"`
	System       *SystemStatistics              `json:"system"`
}

// OrganizationStatistics contains organization-related statistics
type OrganizationStatistics struct {
	TotalSchools     int64 `json:"total_schools"`
	TotalDepartments int64 `json:"total_departments"`
	TotalPositions   int64 `json:"total_positions"`
	TotalRoles       int64 `json:"total_roles"`
	TotalUsers       int64 `json:"total_users"`
}

// SystemStatistics contains system-related statistics
type SystemStatistics struct {
	TotalModules  int64 `json:"total_modules"`
	ActiveModules int64 `json:"active_modules"`
}

// DashboardService defines the interface for dashboard operations
type DashboardService interface {
	GetStatistics() (*DashboardStatistics, error)
	GetEmployeeStatistics() (*repository.EmployeeStatistics, error)
	GetOrganizationStatistics() (*OrganizationStatistics, error)
	GetSystemStatistics() (*SystemStatistics, error)
}

type dashboardService struct {
	employeeRepo repository.EmployeeRepository
	schoolRepo   repository.SchoolRepository
	deptRepo     repository.DepartmentRepository
	positionRepo repository.PositionRepository
	roleRepo     repository.RoleRepository
	userRepo     repository.UserProfileRepository
	moduleRepo   repository.ModuleRepository
}

// NewDashboardService creates a new dashboard service instance
func NewDashboardService(
	employeeRepo repository.EmployeeRepository,
	schoolRepo repository.SchoolRepository,
	deptRepo repository.DepartmentRepository,
	positionRepo repository.PositionRepository,
	roleRepo repository.RoleRepository,
	userRepo repository.UserProfileRepository,
	moduleRepo repository.ModuleRepository,
) DashboardService {
	return &dashboardService{
		employeeRepo: employeeRepo,
		schoolRepo:   schoolRepo,
		deptRepo:     deptRepo,
		positionRepo: positionRepo,
		roleRepo:     roleRepo,
		userRepo:     userRepo,
		moduleRepo:   moduleRepo,
	}
}

// GetStatistics returns aggregated statistics for the dashboard
func (s *dashboardService) GetStatistics() (*DashboardStatistics, error) {
	stats := &DashboardStatistics{}

	// Get employee statistics
	employeeStats, err := s.GetEmployeeStatistics()
	if err == nil {
		stats.Employees = employeeStats
	}

	// Get organization statistics
	orgStats, err := s.GetOrganizationStatistics()
	if err == nil {
		stats.Organization = orgStats
	}

	// Get system statistics
	sysStats, err := s.GetSystemStatistics()
	if err == nil {
		stats.System = sysStats
	}

	return stats, nil
}

// GetEmployeeStatistics returns employee statistics
func (s *dashboardService) GetEmployeeStatistics() (*repository.EmployeeStatistics, error) {
	return s.employeeRepo.GetStatistics()
}

// GetOrganizationStatistics returns organization statistics
// Uses efficient Count() methods instead of fetching all records
func (s *dashboardService) GetOrganizationStatistics() (*OrganizationStatistics, error) {
	stats := &OrganizationStatistics{}

	// Get school count using efficient Count method
	if count, err := s.schoolRepo.Count(); err == nil {
		stats.TotalSchools = count
	}

	// Get department count using efficient Count method
	if count, err := s.deptRepo.Count(); err == nil {
		stats.TotalDepartments = count
	}

	// Get position count using efficient Count method
	if count, err := s.positionRepo.Count(); err == nil {
		stats.TotalPositions = count
	}

	// Get role count using efficient Count method
	if count, err := s.roleRepo.Count(); err == nil {
		stats.TotalRoles = count
	}

	// Get user count using efficient Count method
	if count, err := s.userRepo.Count(); err == nil {
		stats.TotalUsers = count
	}

	return stats, nil
}

// GetSystemStatistics returns system statistics
// Uses efficient Count() methods instead of fetching all records
func (s *dashboardService) GetSystemStatistics() (*SystemStatistics, error) {
	stats := &SystemStatistics{}

	// Get total module count using efficient Count method
	if count, err := s.moduleRepo.Count(); err == nil {
		stats.TotalModules = count
	}

	// Get active module count using efficient CountActive method
	if count, err := s.moduleRepo.CountActive(); err == nil {
		stats.ActiveModules = count
	}

	return stats, nil
}
