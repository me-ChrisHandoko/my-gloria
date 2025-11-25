package service

import (
	"errors"

	"backend/internal/domain"
	"backend/internal/repository"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrPositionNotFound   = errors.New("position not found")
	ErrPositionCodeExists = errors.New("position code already exists")
)

// PositionService defines the interface for position business logic
type PositionService interface {
	GetAll() ([]domain.PositionListResponse, error)
	GetAllPaginated(page, limit int, search string) ([]domain.PositionListResponse, int64, error)
	GetActive() ([]domain.PositionListResponse, error)
	GetByID(id string) (*domain.PositionResponse, error)
	GetByCode(code string) (*domain.PositionResponse, error)
	GetByDepartmentID(departmentID string) ([]domain.PositionListResponse, error)
	GetBySchoolID(schoolID string) ([]domain.PositionListResponse, error)
	GetByHierarchyLevel(level int) ([]domain.PositionListResponse, error)
	GetWithHierarchy(id string) (*domain.PositionResponse, error)
	Create(req *domain.CreatePositionRequest, createdBy *string) (*domain.PositionResponse, error)
	Update(id string, req *domain.UpdatePositionRequest, modifiedBy *string) (*domain.PositionResponse, error)
	Delete(id string) error
}

type positionService struct {
	positionRepo repository.PositionRepository
}

// NewPositionService creates a new position service instance
func NewPositionService(positionRepo repository.PositionRepository) PositionService {
	return &positionService{positionRepo: positionRepo}
}

func (s *positionService) GetAll() ([]domain.PositionListResponse, error) {
	positions, err := s.positionRepo.FindAll()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.PositionListResponse, len(positions))
	for i, pos := range positions {
		responses[i] = *pos.ToListResponse()
	}
	return responses, nil
}

func (s *positionService) GetAllPaginated(page, limit int, search string) ([]domain.PositionListResponse, int64, error) {
	positions, total, err := s.positionRepo.FindAllPaginated(page, limit, search)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]domain.PositionListResponse, len(positions))
	for i, pos := range positions {
		responses[i] = *pos.ToListResponse()
	}
	return responses, total, nil
}

func (s *positionService) GetActive() ([]domain.PositionListResponse, error) {
	positions, err := s.positionRepo.FindActive()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.PositionListResponse, len(positions))
	for i, pos := range positions {
		responses[i] = *pos.ToListResponse()
	}
	return responses, nil
}

func (s *positionService) GetByID(id string) (*domain.PositionResponse, error) {
	position, err := s.positionRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPositionNotFound
		}
		return nil, err
	}
	return position.ToResponse(), nil
}

func (s *positionService) GetByCode(code string) (*domain.PositionResponse, error) {
	position, err := s.positionRepo.FindByCode(code)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPositionNotFound
		}
		return nil, err
	}
	return position.ToResponse(), nil
}

func (s *positionService) GetByDepartmentID(departmentID string) ([]domain.PositionListResponse, error) {
	positions, err := s.positionRepo.FindByDepartmentID(departmentID)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.PositionListResponse, len(positions))
	for i, pos := range positions {
		responses[i] = *pos.ToListResponse()
	}
	return responses, nil
}

func (s *positionService) GetBySchoolID(schoolID string) ([]domain.PositionListResponse, error) {
	positions, err := s.positionRepo.FindBySchoolID(schoolID)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.PositionListResponse, len(positions))
	for i, pos := range positions {
		responses[i] = *pos.ToListResponse()
	}
	return responses, nil
}

func (s *positionService) GetByHierarchyLevel(level int) ([]domain.PositionListResponse, error) {
	positions, err := s.positionRepo.FindByHierarchyLevel(level)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.PositionListResponse, len(positions))
	for i, pos := range positions {
		responses[i] = *pos.ToListResponse()
	}
	return responses, nil
}

func (s *positionService) GetWithHierarchy(id string) (*domain.PositionResponse, error) {
	position, err := s.positionRepo.FindWithHierarchy(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPositionNotFound
		}
		return nil, err
	}
	return position.ToResponse(), nil
}

func (s *positionService) Create(req *domain.CreatePositionRequest, createdBy *string) (*domain.PositionResponse, error) {
	existing, _ := s.positionRepo.FindByCode(req.Code)
	if existing != nil {
		return nil, ErrPositionCodeExists
	}

	positionID := uuid.New().String()

	position := &domain.Position{
		ID:             positionID,
		Code:           req.Code,
		Name:           req.Name,
		DepartmentID:   req.DepartmentID,
		SchoolID:       req.SchoolID,
		HierarchyLevel: req.HierarchyLevel,
		MaxHolders:     1,
		IsUnique:       true,
		IsActive:       true,
		CreatedBy:      createdBy,
	}

	if req.MaxHolders != nil {
		position.MaxHolders = *req.MaxHolders
	}
	if req.IsUnique != nil {
		position.IsUnique = *req.IsUnique
	}

	if err := s.positionRepo.Create(position); err != nil {
		return nil, err
	}

	// Create hierarchy if reports_to or coordinator is specified
	if req.ReportsToID != nil || req.CoordinatorID != nil {
		hierarchy := &domain.PositionHierarchy{
			ID:            uuid.New().String(),
			PositionID:    positionID,
			ReportsToID:   req.ReportsToID,
			CoordinatorID: req.CoordinatorID,
		}
		if err := s.positionRepo.CreateHierarchy(hierarchy); err != nil {
			return nil, err
		}
	}

	return position.ToResponse(), nil
}

func (s *positionService) Update(id string, req *domain.UpdatePositionRequest, modifiedBy *string) (*domain.PositionResponse, error) {
	position, err := s.positionRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPositionNotFound
		}
		return nil, err
	}

	if req.Code != nil && *req.Code != position.Code {
		existing, _ := s.positionRepo.FindByCode(*req.Code)
		if existing != nil {
			return nil, ErrPositionCodeExists
		}
		position.Code = *req.Code
	}

	if req.Name != nil {
		position.Name = *req.Name
	}
	if req.DepartmentID != nil {
		position.DepartmentID = req.DepartmentID
	}
	if req.SchoolID != nil {
		position.SchoolID = req.SchoolID
	}
	if req.HierarchyLevel != nil {
		position.HierarchyLevel = *req.HierarchyLevel
	}
	if req.MaxHolders != nil {
		position.MaxHolders = *req.MaxHolders
	}
	if req.IsUnique != nil {
		position.IsUnique = *req.IsUnique
	}
	if req.IsActive != nil {
		position.IsActive = *req.IsActive
	}
	position.ModifiedBy = modifiedBy

	if err := s.positionRepo.Update(position); err != nil {
		return nil, err
	}

	// Update hierarchy if reports_to or coordinator is changed
	if req.ReportsToID != nil || req.CoordinatorID != nil {
		hierarchy, _ := s.positionRepo.GetHierarchy(id)
		if hierarchy != nil {
			if req.ReportsToID != nil {
				hierarchy.ReportsToID = req.ReportsToID
			}
			if req.CoordinatorID != nil {
				hierarchy.CoordinatorID = req.CoordinatorID
			}
			if err := s.positionRepo.UpdateHierarchy(hierarchy); err != nil {
				return nil, err
			}
		} else {
			newHierarchy := &domain.PositionHierarchy{
				ID:            uuid.New().String(),
				PositionID:    id,
				ReportsToID:   req.ReportsToID,
				CoordinatorID: req.CoordinatorID,
			}
			if err := s.positionRepo.CreateHierarchy(newHierarchy); err != nil {
				return nil, err
			}
		}
	}

	return position.ToResponse(), nil
}

func (s *positionService) Delete(id string) error {
	_, err := s.positionRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrPositionNotFound
		}
		return err
	}

	// Delete hierarchy first
	_ = s.positionRepo.DeleteHierarchy(id)

	return s.positionRepo.Delete(id)
}
