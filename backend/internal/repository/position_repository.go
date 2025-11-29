package repository

import (
	"backend/internal/domain"

	"gorm.io/gorm"
)

// PositionRepository defines the interface for position data access
type PositionRepository interface {
	FindAll() ([]domain.Position, error)
	FindAllPaginated(page, limit int, search string) ([]domain.Position, int64, error)
	FindByID(id string) (*domain.Position, error)
	FindByCode(code string) (*domain.Position, error)
	FindActive() ([]domain.Position, error)
	FindByDepartmentID(departmentID string) ([]domain.Position, error)
	FindBySchoolID(schoolID string) ([]domain.Position, error)
	FindByHierarchyLevel(level int) ([]domain.Position, error)
	FindWithHierarchy(id string) (*domain.Position, error)
	Create(position *domain.Position) error
	Update(position *domain.Position) error
	Delete(id string) error
	Count() (int64, error)

	// Hierarchy management
	CreateHierarchy(hierarchy *domain.PositionHierarchy) error
	UpdateHierarchy(hierarchy *domain.PositionHierarchy) error
	DeleteHierarchy(positionID string) error
	GetHierarchy(positionID string) (*domain.PositionHierarchy, error)
}

type positionRepository struct {
	db *gorm.DB
}

// NewPositionRepository creates a new position repository instance
func NewPositionRepository(db *gorm.DB) PositionRepository {
	return &positionRepository{db: db}
}

func (r *positionRepository) FindAll() ([]domain.Position, error) {
	var positions []domain.Position
	if err := r.db.Order("hierarchy_level, name").Find(&positions).Error; err != nil {
		return nil, err
	}
	return positions, nil
}

func (r *positionRepository) FindAllPaginated(page, limit int, search string) ([]domain.Position, int64, error) {
	var positions []domain.Position
	var total int64

	query := r.db.Model(&domain.Position{})

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("name LIKE ? OR code LIKE ? OR description LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := r.db.Where(query).Offset(offset).Limit(limit).Order("hierarchy_level, name").Find(&positions).Error; err != nil {
		return nil, 0, err
	}

	return positions, total, nil
}

func (r *positionRepository) FindByID(id string) (*domain.Position, error) {
	var position domain.Position
	if err := r.db.Preload("Department").Preload("School").First(&position, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &position, nil
}

func (r *positionRepository) FindByCode(code string) (*domain.Position, error) {
	var position domain.Position
	if err := r.db.First(&position, "code = ?", code).Error; err != nil {
		return nil, err
	}
	return &position, nil
}

func (r *positionRepository) FindActive() ([]domain.Position, error) {
	var positions []domain.Position
	if err := r.db.Where("is_active = true").Order("hierarchy_level, name").Find(&positions).Error; err != nil {
		return nil, err
	}
	return positions, nil
}

func (r *positionRepository) FindByDepartmentID(departmentID string) ([]domain.Position, error) {
	var positions []domain.Position
	if err := r.db.Where("department_id = ?", departmentID).Order("hierarchy_level, name").Find(&positions).Error; err != nil {
		return nil, err
	}
	return positions, nil
}

func (r *positionRepository) FindBySchoolID(schoolID string) ([]domain.Position, error) {
	var positions []domain.Position
	if err := r.db.Where("school_id = ?", schoolID).Order("hierarchy_level, name").Find(&positions).Error; err != nil {
		return nil, err
	}
	return positions, nil
}

func (r *positionRepository) FindByHierarchyLevel(level int) ([]domain.Position, error) {
	var positions []domain.Position
	if err := r.db.Where("hierarchy_level = ? AND is_active = true", level).Order("name").Find(&positions).Error; err != nil {
		return nil, err
	}
	return positions, nil
}

func (r *positionRepository) FindWithHierarchy(id string) (*domain.Position, error) {
	var position domain.Position
	if err := r.db.
		Preload("Department").
		Preload("School").
		Preload("PositionHierarchy").
		Preload("PositionHierarchy.ReportsTo").
		Preload("PositionHierarchy.Coordinator").
		First(&position, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &position, nil
}

func (r *positionRepository) Create(position *domain.Position) error {
	return r.db.Create(position).Error
}

func (r *positionRepository) Update(position *domain.Position) error {
	return r.db.Save(position).Error
}

func (r *positionRepository) Delete(id string) error {
	return r.db.Delete(&domain.Position{}, "id = ?", id).Error
}

func (r *positionRepository) Count() (int64, error) {
	var count int64
	if err := r.db.Model(&domain.Position{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *positionRepository) CreateHierarchy(hierarchy *domain.PositionHierarchy) error {
	return r.db.Create(hierarchy).Error
}

func (r *positionRepository) UpdateHierarchy(hierarchy *domain.PositionHierarchy) error {
	return r.db.Save(hierarchy).Error
}

func (r *positionRepository) DeleteHierarchy(positionID string) error {
	return r.db.Delete(&domain.PositionHierarchy{}, "position_id = ?", positionID).Error
}

func (r *positionRepository) GetHierarchy(positionID string) (*domain.PositionHierarchy, error) {
	var hierarchy domain.PositionHierarchy
	if err := r.db.
		Preload("ReportsTo").
		Preload("Coordinator").
		First(&hierarchy, "position_id = ?", positionID).Error; err != nil {
		return nil, err
	}
	return &hierarchy, nil
}
