package repository

import (
	"backend/internal/domain"

	"gorm.io/gorm"
)

// SchoolRepository defines the interface for school data access
type SchoolRepository interface {
	FindAll() ([]domain.School, error)
	FindAllPaginated(page, limit int, search string) ([]domain.School, int64, error)
	FindByID(id string) (*domain.School, error)
	FindByCode(code string) (*domain.School, error)
	FindActive() ([]domain.School, error)
	FindWithDepartments(id string) (*domain.School, error)
	Create(school *domain.School) error
	Update(school *domain.School) error
	Delete(id string) error
}

type schoolRepository struct {
	db *gorm.DB
}

// NewSchoolRepository creates a new school repository instance
func NewSchoolRepository(db *gorm.DB) SchoolRepository {
	return &schoolRepository{db: db}
}

func (r *schoolRepository) FindAll() ([]domain.School, error) {
	var schools []domain.School
	if err := r.db.Order("name").Find(&schools).Error; err != nil {
		return nil, err
	}
	return schools, nil
}

func (r *schoolRepository) FindAllPaginated(page, limit int, search string) ([]domain.School, int64, error) {
	var schools []domain.School
	var total int64

	query := r.db.Model(&domain.School{})

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("name LIKE ? OR code LIKE ? OR address LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := r.db.Where(query).Offset(offset).Limit(limit).Order("name").Find(&schools).Error; err != nil {
		return nil, 0, err
	}

	return schools, total, nil
}

func (r *schoolRepository) FindByID(id string) (*domain.School, error) {
	var school domain.School
	if err := r.db.First(&school, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &school, nil
}

func (r *schoolRepository) FindByCode(code string) (*domain.School, error) {
	var school domain.School
	if err := r.db.First(&school, "code = ?", code).Error; err != nil {
		return nil, err
	}
	return &school, nil
}

func (r *schoolRepository) FindActive() ([]domain.School, error) {
	var schools []domain.School
	if err := r.db.Where("is_active = true").Order("name").Find(&schools).Error; err != nil {
		return nil, err
	}
	return schools, nil
}

func (r *schoolRepository) FindWithDepartments(id string) (*domain.School, error) {
	var school domain.School
	if err := r.db.Preload("Departments").First(&school, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &school, nil
}

func (r *schoolRepository) Create(school *domain.School) error {
	return r.db.Create(school).Error
}

func (r *schoolRepository) Update(school *domain.School) error {
	return r.db.Save(school).Error
}

func (r *schoolRepository) Delete(id string) error {
	return r.db.Delete(&domain.School{}, "id = ?", id).Error
}
