package service

import (
	"errors"

	"backend/internal/domain"
	"backend/internal/repository"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrSchoolNotFound   = errors.New("school not found")
	ErrSchoolCodeExists = errors.New("school code already exists")
)

// SchoolService defines the interface for school business logic
type SchoolService interface {
	GetAll() ([]domain.SchoolListResponse, error)
	GetAllPaginated(page, limit int, search string) ([]domain.SchoolListResponse, int64, error)
	GetActive() ([]domain.SchoolListResponse, error)
	GetByID(id string) (*domain.SchoolResponse, error)
	GetByCode(code string) (*domain.SchoolResponse, error)
	Create(req *domain.CreateSchoolRequest, createdBy *string) (*domain.SchoolResponse, error)
	Update(id string, req *domain.UpdateSchoolRequest, modifiedBy *string) (*domain.SchoolResponse, error)
	Delete(id string) error
}

type schoolService struct {
	schoolRepo repository.SchoolRepository
}

// NewSchoolService creates a new school service instance
func NewSchoolService(schoolRepo repository.SchoolRepository) SchoolService {
	return &schoolService{schoolRepo: schoolRepo}
}

func (s *schoolService) GetAll() ([]domain.SchoolListResponse, error) {
	schools, err := s.schoolRepo.FindAll()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.SchoolListResponse, len(schools))
	for i, school := range schools {
		responses[i] = *school.ToListResponse()
	}
	return responses, nil
}

func (s *schoolService) GetAllPaginated(page, limit int, search string) ([]domain.SchoolListResponse, int64, error) {
	schools, total, err := s.schoolRepo.FindAllPaginated(page, limit, search)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]domain.SchoolListResponse, len(schools))
	for i, school := range schools {
		responses[i] = *school.ToListResponse()
	}
	return responses, total, nil
}

func (s *schoolService) GetActive() ([]domain.SchoolListResponse, error) {
	schools, err := s.schoolRepo.FindActive()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.SchoolListResponse, len(schools))
	for i, school := range schools {
		responses[i] = *school.ToListResponse()
	}
	return responses, nil
}

func (s *schoolService) GetByID(id string) (*domain.SchoolResponse, error) {
	school, err := s.schoolRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSchoolNotFound
		}
		return nil, err
	}
	return school.ToResponse(), nil
}

func (s *schoolService) GetByCode(code string) (*domain.SchoolResponse, error) {
	school, err := s.schoolRepo.FindByCode(code)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSchoolNotFound
		}
		return nil, err
	}
	return school.ToResponse(), nil
}

func (s *schoolService) Create(req *domain.CreateSchoolRequest, createdBy *string) (*domain.SchoolResponse, error) {
	existing, _ := s.schoolRepo.FindByCode(req.Code)
	if existing != nil {
		return nil, ErrSchoolCodeExists
	}

	school := &domain.School{
		ID:        uuid.New().String(),
		Code:      req.Code,
		Name:      req.Name,
		Lokasi:    req.Lokasi,
		Address:   req.Address,
		Phone:     req.Phone,
		Email:     req.Email,
		Principal: req.Principal,
		IsActive:  true,
		CreatedBy: createdBy,
	}

	if err := s.schoolRepo.Create(school); err != nil {
		return nil, err
	}

	return school.ToResponse(), nil
}

func (s *schoolService) Update(id string, req *domain.UpdateSchoolRequest, modifiedBy *string) (*domain.SchoolResponse, error) {
	school, err := s.schoolRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSchoolNotFound
		}
		return nil, err
	}

	if req.Code != nil && *req.Code != school.Code {
		existing, _ := s.schoolRepo.FindByCode(*req.Code)
		if existing != nil {
			return nil, ErrSchoolCodeExists
		}
		school.Code = *req.Code
	}

	if req.Name != nil {
		school.Name = *req.Name
	}
	if req.Lokasi != nil {
		school.Lokasi = req.Lokasi
	}
	if req.Address != nil {
		school.Address = req.Address
	}
	if req.Phone != nil {
		school.Phone = req.Phone
	}
	if req.Email != nil {
		school.Email = req.Email
	}
	if req.Principal != nil {
		school.Principal = req.Principal
	}
	if req.IsActive != nil {
		school.IsActive = *req.IsActive
	}
	school.ModifiedBy = modifiedBy

	if err := s.schoolRepo.Update(school); err != nil {
		return nil, err
	}

	return school.ToResponse(), nil
}

func (s *schoolService) Delete(id string) error {
	_, err := s.schoolRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrSchoolNotFound
		}
		return err
	}
	return s.schoolRepo.Delete(id)
}
