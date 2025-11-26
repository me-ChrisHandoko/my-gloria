package service

import (
	"errors"

	"backend/internal/domain"
	"backend/internal/repository"
)

var (
	ErrEmployeeNotFound = errors.New("employee not found")
)

// EmployeeService defines the interface for employee business operations
type EmployeeService interface {
	GetByNIP(nip string) (*domain.DataKaryawanResponse, error)
	GetAll(page, limit int, search string) ([]domain.DataKaryawanListResponse, int64, error)
	GetActive(page, limit int, search string) ([]domain.DataKaryawanListResponse, int64, error)
	GetByDepartment(bagianKerja string, page, limit int) ([]domain.DataKaryawanListResponse, int64, error)
	GetByLocation(lokasi string, page, limit int) ([]domain.DataKaryawanListResponse, int64, error)
	Search(query string, limit int) ([]domain.DataKaryawanListResponse, error)
	GetStatistics() (*repository.EmployeeStatistics, error)
}

// employeeService implements EmployeeService
type employeeService struct {
	employeeRepo repository.EmployeeRepository
}

// NewEmployeeService creates a new employee service instance
func NewEmployeeService(employeeRepo repository.EmployeeRepository) EmployeeService {
	return &employeeService{employeeRepo: employeeRepo}
}

// GetByNIP gets an employee by NIP
func (s *employeeService) GetByNIP(nip string) (*domain.DataKaryawanResponse, error) {
	employee, err := s.employeeRepo.FindByNIP(nip)
	if err != nil {
		if errors.Is(err, repository.ErrEmployeeNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}
	return employee.ToResponse(), nil
}

// GetAll gets all employees with pagination
func (s *employeeService) GetAll(page, limit int, search string) ([]domain.DataKaryawanListResponse, int64, error) {
	employees, total, err := s.employeeRepo.FindAll(page, limit, search)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]domain.DataKaryawanListResponse, len(employees))
	for i, e := range employees {
		responses[i] = *e.ToListResponse()
	}

	return responses, total, nil
}

// GetActive gets all active employees
func (s *employeeService) GetActive(page, limit int, search string) ([]domain.DataKaryawanListResponse, int64, error) {
	employees, total, err := s.employeeRepo.FindActive(page, limit, search)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]domain.DataKaryawanListResponse, len(employees))
	for i, e := range employees {
		responses[i] = *e.ToListResponse()
	}

	return responses, total, nil
}

// GetByDepartment gets employees by department
func (s *employeeService) GetByDepartment(bagianKerja string, page, limit int) ([]domain.DataKaryawanListResponse, int64, error) {
	employees, total, err := s.employeeRepo.FindByDepartment(bagianKerja, page, limit)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]domain.DataKaryawanListResponse, len(employees))
	for i, e := range employees {
		responses[i] = *e.ToListResponse()
	}

	return responses, total, nil
}

// GetByLocation gets employees by location
func (s *employeeService) GetByLocation(lokasi string, page, limit int) ([]domain.DataKaryawanListResponse, int64, error) {
	employees, total, err := s.employeeRepo.FindByLocation(lokasi, page, limit)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]domain.DataKaryawanListResponse, len(employees))
	for i, e := range employees {
		responses[i] = *e.ToListResponse()
	}

	return responses, total, nil
}

// Search searches for employees
func (s *employeeService) Search(query string, limit int) ([]domain.DataKaryawanListResponse, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	employees, err := s.employeeRepo.Search(query, limit)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.DataKaryawanListResponse, len(employees))
	for i, e := range employees {
		responses[i] = *e.ToListResponse()
	}

	return responses, nil
}

// GetStatistics gets employee statistics
func (s *employeeService) GetStatistics() (*repository.EmployeeStatistics, error) {
	return s.employeeRepo.GetStatistics()
}
