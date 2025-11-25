package service

import (
	"errors"

	"backend/internal/domain"
	"backend/internal/repository"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrDepartmentNotFound      = errors.New("department not found")
	ErrDepartmentCodeExists    = errors.New("department code already exists")
	ErrCircularReference       = errors.New("circular reference detected in department hierarchy")
	ErrCannotDeleteWithChildren = errors.New("cannot delete department with child departments")
)

// DepartmentService defines the interface for department business logic
type DepartmentService interface {
	GetAll() ([]domain.DepartmentListResponse, error)
	GetAllPaginated(page, limit int, search string) ([]domain.DepartmentListResponse, int64, error)
	GetActive() ([]domain.DepartmentListResponse, error)
	GetByID(id string) (*domain.DepartmentResponse, error)
	GetByCode(code string) (*domain.DepartmentResponse, error)
	GetBySchoolID(schoolID string) ([]domain.DepartmentListResponse, error)
	GetByParentID(parentID string) ([]domain.DepartmentListResponse, error)
	GetTree() ([]*domain.DepartmentTreeResponse, error)
	Create(req *domain.CreateDepartmentRequest, createdBy *string) (*domain.DepartmentResponse, error)
	Update(id string, req *domain.UpdateDepartmentRequest, modifiedBy *string) (*domain.DepartmentResponse, error)
	Delete(id string) error
}

type departmentService struct {
	departmentRepo repository.DepartmentRepository
}

// NewDepartmentService creates a new department service instance
func NewDepartmentService(departmentRepo repository.DepartmentRepository) DepartmentService {
	return &departmentService{departmentRepo: departmentRepo}
}

func (s *departmentService) GetAll() ([]domain.DepartmentListResponse, error) {
	departments, err := s.departmentRepo.FindAll()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.DepartmentListResponse, len(departments))
	for i, dept := range departments {
		responses[i] = *dept.ToListResponse()
	}
	return responses, nil
}

func (s *departmentService) GetAllPaginated(page, limit int, search string) ([]domain.DepartmentListResponse, int64, error) {
	departments, total, err := s.departmentRepo.FindAllPaginated(page, limit, search)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]domain.DepartmentListResponse, len(departments))
	for i, dept := range departments {
		responses[i] = *dept.ToListResponse()
	}
	return responses, total, nil
}

func (s *departmentService) GetActive() ([]domain.DepartmentListResponse, error) {
	departments, err := s.departmentRepo.FindActive()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.DepartmentListResponse, len(departments))
	for i, dept := range departments {
		responses[i] = *dept.ToListResponse()
	}
	return responses, nil
}

func (s *departmentService) GetByID(id string) (*domain.DepartmentResponse, error) {
	department, err := s.departmentRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDepartmentNotFound
		}
		return nil, err
	}
	return department.ToResponse(), nil
}

func (s *departmentService) GetByCode(code string) (*domain.DepartmentResponse, error) {
	department, err := s.departmentRepo.FindByCode(code)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDepartmentNotFound
		}
		return nil, err
	}
	return department.ToResponse(), nil
}

func (s *departmentService) GetBySchoolID(schoolID string) ([]domain.DepartmentListResponse, error) {
	departments, err := s.departmentRepo.FindBySchoolID(schoolID)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.DepartmentListResponse, len(departments))
	for i, dept := range departments {
		responses[i] = *dept.ToListResponse()
	}
	return responses, nil
}

func (s *departmentService) GetByParentID(parentID string) ([]domain.DepartmentListResponse, error) {
	departments, err := s.departmentRepo.FindByParentID(parentID)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.DepartmentListResponse, len(departments))
	for i, dept := range departments {
		responses[i] = *dept.ToListResponse()
	}
	return responses, nil
}

func (s *departmentService) GetTree() ([]*domain.DepartmentTreeResponse, error) {
	departments, err := s.departmentRepo.FindAll()
	if err != nil {
		return nil, err
	}

	// Build a map for quick lookup
	deptMap := make(map[string]*domain.Department)
	for i := range departments {
		deptMap[departments[i].ID] = &departments[i]
	}

	// Build children relationships
	for i := range departments {
		if departments[i].ParentID != nil {
			if parent, exists := deptMap[*departments[i].ParentID]; exists {
				parent.Children = append(parent.Children, departments[i])
			}
		}
	}

	// Get root departments and convert to tree response
	var roots []*domain.DepartmentTreeResponse
	for i := range departments {
		if departments[i].ParentID == nil {
			roots = append(roots, departments[i].ToTreeResponse())
		}
	}

	return roots, nil
}

func (s *departmentService) Create(req *domain.CreateDepartmentRequest, createdBy *string) (*domain.DepartmentResponse, error) {
	existing, _ := s.departmentRepo.FindByCode(req.Code)
	if existing != nil {
		return nil, ErrDepartmentCodeExists
	}

	department := &domain.Department{
		ID:          uuid.New().String(),
		Code:        req.Code,
		Name:        req.Name,
		SchoolID:    req.SchoolID,
		ParentID:    req.ParentID,
		Description: req.Description,
		IsActive:    true,
		CreatedBy:   createdBy,
	}

	if err := s.departmentRepo.Create(department); err != nil {
		return nil, err
	}

	return department.ToResponse(), nil
}

func (s *departmentService) Update(id string, req *domain.UpdateDepartmentRequest, modifiedBy *string) (*domain.DepartmentResponse, error) {
	department, err := s.departmentRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDepartmentNotFound
		}
		return nil, err
	}

	if req.Code != nil && *req.Code != department.Code {
		existing, _ := s.departmentRepo.FindByCode(*req.Code)
		if existing != nil {
			return nil, ErrDepartmentCodeExists
		}
		department.Code = *req.Code
	}

	// Check for circular reference if parent is being changed
	if req.ParentID != nil && (department.ParentID == nil || *req.ParentID != *department.ParentID) {
		allDepts, err := s.departmentRepo.GetAllAsMap()
		if err != nil {
			return nil, err
		}
		if department.HasCircularReference(*req.ParentID, allDepts) {
			return nil, ErrCircularReference
		}
		department.ParentID = req.ParentID
	}

	if req.Name != nil {
		department.Name = *req.Name
	}
	if req.SchoolID != nil {
		department.SchoolID = req.SchoolID
	}
	if req.Description != nil {
		department.Description = req.Description
	}
	if req.IsActive != nil {
		department.IsActive = *req.IsActive
	}
	department.ModifiedBy = modifiedBy

	if err := s.departmentRepo.Update(department); err != nil {
		return nil, err
	}

	return department.ToResponse(), nil
}

func (s *departmentService) Delete(id string) error {
	_, err := s.departmentRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrDepartmentNotFound
		}
		return err
	}

	// Check for child departments
	children, err := s.departmentRepo.FindByParentID(id)
	if err != nil {
		return err
	}
	if len(children) > 0 {
		return ErrCannotDeleteWithChildren
	}

	return s.departmentRepo.Delete(id)
}
