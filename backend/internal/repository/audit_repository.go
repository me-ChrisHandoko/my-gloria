package repository

import (
	"time"

	"backend/internal/domain"

	"gorm.io/gorm"
)

// AuditRepository defines the interface for audit log data access
type AuditRepository interface {
	FindAll(filter *domain.AuditLogFilter) ([]domain.AuditLog, int64, error)
	FindByID(id string) (*domain.AuditLog, error)
	FindByActorID(actorID string, limit int) ([]domain.AuditLog, error)
	FindByEntityID(entityType, entityID string, limit int) ([]domain.AuditLog, error)
	FindByModule(module string, limit int) ([]domain.AuditLog, error)
	FindByDateRange(startDate, endDate time.Time, limit int) ([]domain.AuditLog, error)
	Create(auditLog *domain.AuditLog) error
	GetModules() ([]string, error)
	GetEntityTypes() ([]string, error)
	Count(filter *domain.AuditLogFilter) (int64, error)
}

type auditRepository struct {
	db *gorm.DB
}

// NewAuditRepository creates a new audit repository instance
func NewAuditRepository(db *gorm.DB) AuditRepository {
	return &auditRepository{db: db}
}

func (r *auditRepository) FindAll(filter *domain.AuditLogFilter) ([]domain.AuditLog, int64, error) {
	var logs []domain.AuditLog
	var total int64

	query := r.db.Model(&domain.AuditLog{})

	// Apply filters
	if filter.ActorProfileID != nil {
		query = query.Where("actor_profile_id = ?", *filter.ActorProfileID)
	}
	if filter.Action != nil {
		query = query.Where("action = ?", *filter.Action)
	}
	if filter.Module != nil {
		query = query.Where("module = ?", *filter.Module)
	}
	if filter.EntityType != nil {
		query = query.Where("entity_type = ?", *filter.EntityType)
	}
	if filter.EntityID != nil {
		query = query.Where("entity_id = ?", *filter.EntityID)
	}
	if filter.Category != nil {
		query = query.Where("category = ?", *filter.Category)
	}
	if filter.TargetUserID != nil {
		query = query.Where("target_user_id = ?", *filter.TargetUserID)
	}
	if filter.StartDate != nil {
		query = query.Where("created_at >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("created_at <= ?", *filter.EndDate)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (filter.Page - 1) * filter.Limit
	if err := query.
		Preload("ActorProfile.DataKaryawan").
		Preload("TargetUserProfile.DataKaryawan").
		Order("created_at DESC").
		Offset(offset).
		Limit(filter.Limit).
		Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

func (r *auditRepository) FindByID(id string) (*domain.AuditLog, error) {
	var log domain.AuditLog
	if err := r.db.
		Preload("ActorProfile.DataKaryawan").
		Preload("TargetUserProfile.DataKaryawan").
		First(&log, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &log, nil
}

func (r *auditRepository) FindByActorID(actorID string, limit int) ([]domain.AuditLog, error) {
	var logs []domain.AuditLog
	if err := r.db.
		Preload("ActorProfile.DataKaryawan").
		Where("actor_id = ?", actorID).
		Order("created_at DESC").
		Limit(limit).
		Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *auditRepository) FindByEntityID(entityType, entityID string, limit int) ([]domain.AuditLog, error) {
	var logs []domain.AuditLog
	if err := r.db.
		Preload("ActorProfile.DataKaryawan").
		Where("entity_type = ? AND entity_id = ?", entityType, entityID).
		Order("created_at DESC").
		Limit(limit).
		Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *auditRepository) FindByModule(module string, limit int) ([]domain.AuditLog, error) {
	var logs []domain.AuditLog
	if err := r.db.
		Preload("ActorProfile.DataKaryawan").
		Where("module = ?", module).
		Order("created_at DESC").
		Limit(limit).
		Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *auditRepository) FindByDateRange(startDate, endDate time.Time, limit int) ([]domain.AuditLog, error) {
	var logs []domain.AuditLog
	if err := r.db.
		Preload("ActorProfile.DataKaryawan").
		Where("created_at >= ? AND created_at <= ?", startDate, endDate).
		Order("created_at DESC").
		Limit(limit).
		Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *auditRepository) Create(auditLog *domain.AuditLog) error {
	return r.db.Create(auditLog).Error
}

func (r *auditRepository) GetModules() ([]string, error) {
	var modules []string
	if err := r.db.Model(&domain.AuditLog{}).
		Distinct("module").
		Order("module").
		Pluck("module", &modules).Error; err != nil {
		return nil, err
	}
	return modules, nil
}

func (r *auditRepository) GetEntityTypes() ([]string, error) {
	var entityTypes []string
	if err := r.db.Model(&domain.AuditLog{}).
		Distinct("entity_type").
		Order("entity_type").
		Pluck("entity_type", &entityTypes).Error; err != nil {
		return nil, err
	}
	return entityTypes, nil
}

func (r *auditRepository) Count(filter *domain.AuditLogFilter) (int64, error) {
	var count int64
	query := r.db.Model(&domain.AuditLog{})

	if filter.ActorProfileID != nil {
		query = query.Where("actor_profile_id = ?", *filter.ActorProfileID)
	}
	if filter.Action != nil {
		query = query.Where("action = ?", *filter.Action)
	}
	if filter.Module != nil {
		query = query.Where("module = ?", *filter.Module)
	}
	if filter.EntityType != nil {
		query = query.Where("entity_type = ?", *filter.EntityType)
	}
	if filter.Category != nil {
		query = query.Where("category = ?", *filter.Category)
	}
	if filter.StartDate != nil {
		query = query.Where("created_at >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("created_at <= ?", *filter.EndDate)
	}

	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}
