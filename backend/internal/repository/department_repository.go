package repository

import (
	"backend/internal/domain"

	"gorm.io/gorm"
)

// DepartmentRepository defines the interface for department data access
type DepartmentRepository interface {
	FindAll() ([]domain.Department, error)
	FindAllPaginated(page, limit int, search string) ([]domain.Department, int64, error)
	FindByID(id string) (*domain.Department, error)
	FindByCode(code string) (*domain.Department, error)
	FindActive() ([]domain.Department, error)
	FindBySchoolID(schoolID string) ([]domain.Department, error)
	FindByParentID(parentID string) ([]domain.Department, error)
	FindRootDepartments() ([]domain.Department, error)
	FindWithPositions(id string) (*domain.Department, error)
	FindWithChildren(id string) (*domain.Department, error)
	Create(department *domain.Department) error
	Update(department *domain.Department) error
	Delete(id string) error
	GetAllAsMap() (map[string]*domain.Department, error)
	Count() (int64, error)
}

type departmentRepository struct {
	db *gorm.DB
}

// NewDepartmentRepository creates a new department repository instance
func NewDepartmentRepository(db *gorm.DB) DepartmentRepository {
	return &departmentRepository{db: db}
}

func (r *departmentRepository) FindAll() ([]domain.Department, error) {
	var departments []domain.Department
	if err := r.db.Order("name").Find(&departments).Error; err != nil {
		return nil, err
	}
	return departments, nil
}

func (r *departmentRepository) FindAllPaginated(page, limit int, search string) ([]domain.Department, int64, error) {
	var departments []domain.Department
	var total int64

	query := r.db.Model(&domain.Department{})

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("name LIKE ? OR code LIKE ? OR description LIKE ?", searchPattern, searchPattern, searchPattern)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := r.db.Where(query).Offset(offset).Limit(limit).Order("name").Find(&departments).Error; err != nil {
		return nil, 0, err
	}

	return departments, total, nil
}

func (r *departmentRepository) FindByID(id string) (*domain.Department, error) {
	var department domain.Department
	if err := r.db.Preload("School").Preload("Parent").First(&department, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &department, nil
}

func (r *departmentRepository) FindByCode(code string) (*domain.Department, error) {
	var department domain.Department
	if err := r.db.First(&department, "code = ?", code).Error; err != nil {
		return nil, err
	}
	return &department, nil
}

func (r *departmentRepository) FindActive() ([]domain.Department, error) {
	var departments []domain.Department
	if err := r.db.Where("is_active = true").Order("name").Find(&departments).Error; err != nil {
		return nil, err
	}
	return departments, nil
}

func (r *departmentRepository) FindBySchoolID(schoolID string) ([]domain.Department, error) {
	var departments []domain.Department
	if err := r.db.Where("school_id = ?", schoolID).Order("name").Find(&departments).Error; err != nil {
		return nil, err
	}
	return departments, nil
}

func (r *departmentRepository) FindByParentID(parentID string) ([]domain.Department, error) {
	var departments []domain.Department
	if err := r.db.Where("parent_id = ?", parentID).Order("name").Find(&departments).Error; err != nil {
		return nil, err
	}
	return departments, nil
}

func (r *departmentRepository) FindRootDepartments() ([]domain.Department, error) {
	var departments []domain.Department
	if err := r.db.Where("parent_id IS NULL").Order("name").Find(&departments).Error; err != nil {
		return nil, err
	}
	return departments, nil
}

func (r *departmentRepository) FindWithPositions(id string) (*domain.Department, error) {
	var department domain.Department
	if err := r.db.Preload("Positions").First(&department, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &department, nil
}

func (r *departmentRepository) FindWithChildren(id string) (*domain.Department, error) {
	var department domain.Department
	if err := r.db.Preload("Children").First(&department, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &department, nil
}

func (r *departmentRepository) Create(department *domain.Department) error {
	return r.db.Create(department).Error
}

func (r *departmentRepository) Update(department *domain.Department) error {
	return r.db.Save(department).Error
}

func (r *departmentRepository) Delete(id string) error {
	return r.db.Delete(&domain.Department{}, "id = ?", id).Error
}

func (r *departmentRepository) GetAllAsMap() (map[string]*domain.Department, error) {
	var departments []domain.Department
	if err := r.db.Find(&departments).Error; err != nil {
		return nil, err
	}

	result := make(map[string]*domain.Department)
	for i := range departments {
		result[departments[i].ID] = &departments[i]
	}
	return result, nil
}

func (r *departmentRepository) Count() (int64, error) {
	var count int64
	if err := r.db.Model(&domain.Department{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}
