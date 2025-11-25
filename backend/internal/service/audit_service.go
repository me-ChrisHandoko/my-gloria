package service

import (
	"encoding/json"
	"errors"
	"reflect"
	"time"

	"backend/internal/domain"
	"backend/internal/repository"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

var (
	ErrAuditLogNotFound = errors.New("audit log not found")
)

// AuditService defines the interface for audit log business logic
type AuditService interface {
	// Query methods
	GetAll(filter *domain.AuditLogFilter) ([]domain.AuditLogListResponse, int64, error)
	GetByID(id string) (*domain.AuditLogResponse, error)
	GetByActorID(actorID string, limit int) ([]domain.AuditLogListResponse, error)
	GetByEntityID(entityType, entityID string, limit int) ([]domain.AuditLogListResponse, error)
	GetByModule(module string, limit int) ([]domain.AuditLogListResponse, error)
	GetMyAuditLogs(userID string, limit int) ([]domain.AuditLogListResponse, error)
	GetModules() ([]string, error)
	GetEntityTypes() ([]string, error)
	GetActions() []domain.AuditAction
	GetCategories() []domain.AuditCategory

	// Logging methods
	Log(entry *AuditEntry) error
	LogCreate(actorID string, actorProfileID *string, module, entityType, entityID string, entityDisplay *string, newValues interface{}, metadata map[string]interface{}, ipAddress, userAgent *string) error
	LogUpdate(actorID string, actorProfileID *string, module, entityType, entityID string, entityDisplay *string, oldValues, newValues interface{}, metadata map[string]interface{}, ipAddress, userAgent *string) error
	LogDelete(actorID string, actorProfileID *string, module, entityType, entityID string, entityDisplay *string, oldValues interface{}, metadata map[string]interface{}, ipAddress, userAgent *string) error
	LogAction(actorID string, actorProfileID *string, action domain.AuditAction, module, entityType, entityID string, entityDisplay *string, metadata map[string]interface{}, ipAddress, userAgent *string) error
	LogAuthEvent(actorID string, actorProfileID *string, action domain.AuditAction, entityType, entityID string, metadata map[string]interface{}, ipAddress, userAgent *string) error
}

// AuditEntry represents a structured audit log entry for creation
type AuditEntry struct {
	ActorID        string
	ActorProfileID *string
	Action         domain.AuditAction
	Module         string
	EntityType     string
	EntityID       string
	EntityDisplay  *string
	OldValues      interface{}
	NewValues      interface{}
	TargetUserID   *string
	Metadata       map[string]interface{}
	IPAddress      *string
	UserAgent      *string
	Category       *domain.AuditCategory
}

type auditService struct {
	auditRepo repository.AuditRepository
}

// NewAuditService creates a new audit service instance
func NewAuditService(auditRepo repository.AuditRepository) AuditService {
	return &auditService{auditRepo: auditRepo}
}

func (s *auditService) GetAll(filter *domain.AuditLogFilter) ([]domain.AuditLogListResponse, int64, error) {
	// Set defaults
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 50
	}

	logs, total, err := s.auditRepo.FindAll(filter)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]domain.AuditLogListResponse, len(logs))
	for i, log := range logs {
		responses[i] = *log.ToListResponse()
	}
	return responses, total, nil
}

func (s *auditService) GetByID(id string) (*domain.AuditLogResponse, error) {
	log, err := s.auditRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAuditLogNotFound
		}
		return nil, err
	}
	return log.ToResponse(), nil
}

func (s *auditService) GetByActorID(actorID string, limit int) ([]domain.AuditLogListResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	logs, err := s.auditRepo.FindByActorID(actorID, limit)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.AuditLogListResponse, len(logs))
	for i, log := range logs {
		responses[i] = *log.ToListResponse()
	}
	return responses, nil
}

func (s *auditService) GetByEntityID(entityType, entityID string, limit int) ([]domain.AuditLogListResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	logs, err := s.auditRepo.FindByEntityID(entityType, entityID, limit)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.AuditLogListResponse, len(logs))
	for i, log := range logs {
		responses[i] = *log.ToListResponse()
	}
	return responses, nil
}

func (s *auditService) GetByModule(module string, limit int) ([]domain.AuditLogListResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	logs, err := s.auditRepo.FindByModule(module, limit)
	if err != nil {
		return nil, err
	}

	responses := make([]domain.AuditLogListResponse, len(logs))
	for i, log := range logs {
		responses[i] = *log.ToListResponse()
	}
	return responses, nil
}

func (s *auditService) GetMyAuditLogs(userID string, limit int) ([]domain.AuditLogListResponse, error) {
	return s.GetByActorID(userID, limit)
}

func (s *auditService) GetModules() ([]string, error) {
	return s.auditRepo.GetModules()
}

func (s *auditService) GetEntityTypes() ([]string, error) {
	return s.auditRepo.GetEntityTypes()
}

func (s *auditService) GetActions() []domain.AuditAction {
	return domain.AllAuditActions()
}

func (s *auditService) GetCategories() []domain.AuditCategory {
	return domain.AllAuditCategories()
}

func (s *auditService) Log(entry *AuditEntry) error {
	auditLog := &domain.AuditLog{
		ID:             uuid.New().String(),
		ActorID:        entry.ActorID,
		ActorProfileID: entry.ActorProfileID,
		Action:         entry.Action,
		Module:         entry.Module,
		EntityType:     entry.EntityType,
		EntityID:       entry.EntityID,
		EntityDisplay:  entry.EntityDisplay,
		TargetUserID:   entry.TargetUserID,
		IPAddress:      entry.IPAddress,
		UserAgent:      entry.UserAgent,
		Category:       entry.Category,
		CreatedAt:      time.Now(),
	}

	// Convert old values to JSON
	if entry.OldValues != nil {
		oldJSON, err := toJSON(entry.OldValues)
		if err == nil {
			auditLog.OldValues = oldJSON
		}
	}

	// Convert new values to JSON
	if entry.NewValues != nil {
		newJSON, err := toJSON(entry.NewValues)
		if err == nil {
			auditLog.NewValues = newJSON
		}
	}

	// Calculate changed fields
	if entry.OldValues != nil && entry.NewValues != nil {
		changedFields := calculateChangedFields(entry.OldValues, entry.NewValues)
		if len(changedFields) > 0 {
			changedJSON, err := toJSON(changedFields)
			if err == nil {
				auditLog.ChangedFields = changedJSON
			}
		}
	}

	// Convert metadata to JSON
	if entry.Metadata != nil {
		metaJSON, err := toJSON(entry.Metadata)
		if err == nil {
			auditLog.Metadata = metaJSON
		}
	}

	return s.auditRepo.Create(auditLog)
}

func (s *auditService) LogCreate(actorID string, actorProfileID *string, module, entityType, entityID string, entityDisplay *string, newValues interface{}, metadata map[string]interface{}, ipAddress, userAgent *string) error {
	category := domain.AuditCategoryDataChange
	return s.Log(&AuditEntry{
		ActorID:        actorID,
		ActorProfileID: actorProfileID,
		Action:         domain.AuditActionCreate,
		Module:         module,
		EntityType:     entityType,
		EntityID:       entityID,
		EntityDisplay:  entityDisplay,
		NewValues:      newValues,
		Metadata:       metadata,
		IPAddress:      ipAddress,
		UserAgent:      userAgent,
		Category:       &category,
	})
}

func (s *auditService) LogUpdate(actorID string, actorProfileID *string, module, entityType, entityID string, entityDisplay *string, oldValues, newValues interface{}, metadata map[string]interface{}, ipAddress, userAgent *string) error {
	category := domain.AuditCategoryDataChange
	return s.Log(&AuditEntry{
		ActorID:        actorID,
		ActorProfileID: actorProfileID,
		Action:         domain.AuditActionUpdate,
		Module:         module,
		EntityType:     entityType,
		EntityID:       entityID,
		EntityDisplay:  entityDisplay,
		OldValues:      oldValues,
		NewValues:      newValues,
		Metadata:       metadata,
		IPAddress:      ipAddress,
		UserAgent:      userAgent,
		Category:       &category,
	})
}

func (s *auditService) LogDelete(actorID string, actorProfileID *string, module, entityType, entityID string, entityDisplay *string, oldValues interface{}, metadata map[string]interface{}, ipAddress, userAgent *string) error {
	category := domain.AuditCategoryDataChange
	return s.Log(&AuditEntry{
		ActorID:        actorID,
		ActorProfileID: actorProfileID,
		Action:         domain.AuditActionDelete,
		Module:         module,
		EntityType:     entityType,
		EntityID:       entityID,
		EntityDisplay:  entityDisplay,
		OldValues:      oldValues,
		Metadata:       metadata,
		IPAddress:      ipAddress,
		UserAgent:      userAgent,
		Category:       &category,
	})
}

func (s *auditService) LogAction(actorID string, actorProfileID *string, action domain.AuditAction, module, entityType, entityID string, entityDisplay *string, metadata map[string]interface{}, ipAddress, userAgent *string) error {
	return s.Log(&AuditEntry{
		ActorID:        actorID,
		ActorProfileID: actorProfileID,
		Action:         action,
		Module:         module,
		EntityType:     entityType,
		EntityID:       entityID,
		EntityDisplay:  entityDisplay,
		Metadata:       metadata,
		IPAddress:      ipAddress,
		UserAgent:      userAgent,
	})
}

// LogAuthEvent logs authentication-related events like token exchange, login, logout
func (s *auditService) LogAuthEvent(actorID string, actorProfileID *string, action domain.AuditAction, entityType, entityID string, metadata map[string]interface{}, ipAddress, userAgent *string) error {
	category := domain.AuditCategorySecurity
	return s.Log(&AuditEntry{
		ActorID:        actorID,
		ActorProfileID: actorProfileID,
		Action:         action,
		Module:         "authentication",
		EntityType:     entityType,
		EntityID:       entityID,
		Metadata:       metadata,
		IPAddress:      ipAddress,
		UserAgent:      userAgent,
		Category:       &category,
	})
}

// Helper functions

func toJSON(v interface{}) (*datatypes.JSON, error) {
	bytes, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	j := datatypes.JSON(bytes)
	return &j, nil
}

func calculateChangedFields(oldValues, newValues interface{}) []string {
	var changed []string

	oldMap := structToMap(oldValues)
	newMap := structToMap(newValues)

	for key, newVal := range newMap {
		if oldVal, exists := oldMap[key]; exists {
			if !reflect.DeepEqual(oldVal, newVal) {
				changed = append(changed, key)
			}
		} else {
			changed = append(changed, key)
		}
	}

	return changed
}

func structToMap(v interface{}) map[string]interface{} {
	result := make(map[string]interface{})

	bytes, err := json.Marshal(v)
	if err != nil {
		return result
	}

	json.Unmarshal(bytes, &result)
	return result
}
