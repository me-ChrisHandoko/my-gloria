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
func (s *dashboardService) GetOrganizationStatistics() (*OrganizationStatistics, error) {
	stats := &OrganizationStatistics{}

	// Get school count
	schools, err := s.schoolRepo.FindAll()
	if err == nil {
		stats.TotalSchools = int64(len(schools))
	}

	// Get department count
	departments, err := s.deptRepo.FindAll()
	if err == nil {
		stats.TotalDepartments = int64(len(departments))
	}

	// Get position count
	positions, err := s.positionRepo.FindAll()
	if err == nil {
		stats.TotalPositions = int64(len(positions))
	}

	// Get role count
	roles, err := s.roleRepo.FindAll()
	if err == nil {
		stats.TotalRoles = int64(len(roles))
	}

	// Get user count
	users, err := s.userRepo.FindAll()
	if err == nil {
		stats.TotalUsers = int64(len(users))
	}

	return stats, nil
}

// GetSystemStatistics returns system statistics
func (s *dashboardService) GetSystemStatistics() (*SystemStatistics, error) {
	stats := &SystemStatistics{}

	// Get module counts
	_, total, err := s.moduleRepo.FindAll(1, 1, "")
	if err == nil {
		stats.TotalModules = total
	}

	activeModules, err := s.moduleRepo.FindActive()
	if err == nil {
		stats.ActiveModules = int64(len(activeModules))
	}

	return stats, nil
}
