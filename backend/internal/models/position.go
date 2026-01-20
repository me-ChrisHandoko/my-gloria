package models

import (
	"time"
)

// Position represents a job position within a department
type Position struct {
	ID             string    `json:"id" gorm:"type:varchar(36);primaryKey"`
	Code           string    `json:"code" gorm:"type:varchar(50);uniqueIndex;not null"`
	Name           string    `json:"name" gorm:"type:varchar(255);not null"`
	DepartmentID   *string   `json:"department_id,omitempty" gorm:"column:department_id;type:varchar(36)"`
	SchoolID       *string   `json:"school_id,omitempty" gorm:"column:school_id;type:varchar(36)"`
	HierarchyLevel int       `json:"hierarchy_level" gorm:"column:hierarchy_level;not null"`
	MaxHolders     int       `json:"max_holders" gorm:"column:max_holders;default:1"`
	IsUnique       bool      `json:"is_unique" gorm:"column:is_unique;default:true"`
	IsActive       bool      `json:"is_active" gorm:"column:is_active;default:true"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	CreatedBy      *string   `json:"created_by,omitempty" gorm:"column:created_by;type:varchar(36)"`
	ModifiedBy     *string   `json:"modified_by,omitempty" gorm:"column:modified_by;type:varchar(36)"`

	// Relations
	Department       *Department        `json:"department,omitempty" gorm:"foreignKey:DepartmentID"`
	School           *School            `json:"school,omitempty" gorm:"foreignKey:SchoolID;constraint:OnDelete:RESTRICT"`
	RoleModuleAccess []RoleModuleAccess `json:"-" gorm:"foreignKey:PositionID"`
	UserPositions    []UserPosition     `json:"-" gorm:"foreignKey:PositionID"`
}

// TableName specifies the table name for Position
func (Position) TableName() string {
	return "public.positions"
}

// CreatePositionRequest represents the request body for creating a position
type CreatePositionRequest struct {
	Code           string  `json:"code" binding:"required,min=2,max=50"`
	Name           string  `json:"name" binding:"required,min=2,max=255"`
	DepartmentID   *string `json:"department_id,omitempty" binding:"omitempty,uuid"`
	SchoolID       *string `json:"school_id,omitempty" binding:"omitempty,uuid"`
	HierarchyLevel int     `json:"hierarchy_level" binding:"required,min=0"`
	MaxHolders     *int    `json:"max_holders,omitempty" binding:"omitempty,min=1"`
	IsUnique       *bool   `json:"is_unique,omitempty"`
}

// UpdatePositionRequest represents the request body for updating a position
// Note: DepartmentID and SchoolID allow empty string to clear the association (service validates UUID if not empty)
type UpdatePositionRequest struct {
	Code           *string `json:"code,omitempty" binding:"omitempty,min=2,max=50"`
	Name           *string `json:"name,omitempty" binding:"omitempty,min=2,max=255"`
	DepartmentID   *string `json:"department_id,omitempty"`
	SchoolID       *string `json:"school_id,omitempty"`
	HierarchyLevel *int    `json:"hierarchy_level,omitempty" binding:"omitempty,min=0"`
	MaxHolders     *int    `json:"max_holders,omitempty" binding:"omitempty,min=1"`
	IsUnique       *bool   `json:"is_unique,omitempty"`
	IsActive       *bool   `json:"is_active,omitempty"`
}

// PositionResponse represents the response body for position data
type PositionResponse struct {
	ID             string                  `json:"id"`
	Code           string                  `json:"code"`
	Name           string                  `json:"name"`
	DepartmentID   *string                 `json:"department_id,omitempty"`
	SchoolID       *string                 `json:"school_id,omitempty"`
	HierarchyLevel int                     `json:"hierarchy_level"`
	MaxHolders     int                     `json:"max_holders"`
	IsUnique       bool                    `json:"is_unique"`
	IsActive       bool                    `json:"is_active"`
	CreatedAt      time.Time               `json:"created_at"`
	UpdatedAt      time.Time               `json:"updated_at"`
	CreatedBy      *string                 `json:"created_by,omitempty"`
	ModifiedBy     *string                 `json:"modified_by,omitempty"`
	Department     *DepartmentListResponse `json:"department,omitempty"`
	School         *SchoolListResponse     `json:"school,omitempty"`
}

// PositionListResponse represents the response for listing positions
type PositionListResponse struct {
	ID             string  `json:"id"`
	Code           string  `json:"code"`
	Name           string  `json:"name"`
	DepartmentID   *string `json:"department_id,omitempty"`
	SchoolID       *string `json:"school_id,omitempty"`
	HierarchyLevel int     `json:"hierarchy_level"`
	IsActive       bool    `json:"is_active"`
}

// ToResponse converts Position to PositionResponse
func (p *Position) ToResponse() *PositionResponse {
	resp := &PositionResponse{
		ID:             p.ID,
		Code:           p.Code,
		Name:           p.Name,
		DepartmentID:   p.DepartmentID,
		SchoolID:       p.SchoolID,
		HierarchyLevel: p.HierarchyLevel,
		MaxHolders:     p.MaxHolders,
		IsUnique:       p.IsUnique,
		IsActive:       p.IsActive,
		CreatedAt:      p.CreatedAt,
		UpdatedAt:      p.UpdatedAt,
		CreatedBy:      p.CreatedBy,
		ModifiedBy:     p.ModifiedBy,
	}

	if p.Department != nil {
		resp.Department = p.Department.ToListResponse()
	}

	if p.School != nil {
		resp.School = p.School.ToListResponse()
	}

	return resp
}

// ToListResponse converts Position to PositionListResponse
func (p *Position) ToListResponse() *PositionListResponse {
	return &PositionListResponse{
		ID:             p.ID,
		Code:           p.Code,
		Name:           p.Name,
		DepartmentID:   p.DepartmentID,
		SchoolID:       p.SchoolID,
		HierarchyLevel: p.HierarchyLevel,
		IsActive:       p.IsActive,
	}
}
