package models

import (
	"time"
)

// Department represents a department/unit within a school
type Department struct {
	ID          string    `json:"id" gorm:"type:varchar(36);primaryKey"`
	Code        string    `json:"code" gorm:"type:varchar(50);uniqueIndex;not null"`
	Name        string    `json:"name" gorm:"type:varchar(255);not null"`
	SchoolID    *string   `json:"school_id,omitempty" gorm:"column:school_id;type:varchar(36);index"`
	ParentID    *string   `json:"parent_id,omitempty" gorm:"column:parent_id;type:varchar(36);index"`
	Description *string   `json:"description,omitempty" gorm:"type:text"`
	IsActive    bool      `json:"is_active" gorm:"column:is_active;default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	CreatedBy   *string   `json:"created_by,omitempty" gorm:"column:created_by;type:varchar(36);index"`
	ModifiedBy  *string   `json:"modified_by,omitempty" gorm:"column:modified_by;type:varchar(36)"`

	// Relations
	School    *School       `json:"school,omitempty" gorm:"foreignKey:SchoolID;constraint:OnDelete:RESTRICT"`
	Parent    *Department   `json:"parent,omitempty" gorm:"foreignKey:ParentID;constraint:OnDelete:RESTRICT"`
	Children  []Department  `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	Positions []Position    `json:"positions,omitempty" gorm:"foreignKey:DepartmentID"`
}

// TableName specifies the table name for Department
func (Department) TableName() string {
	return "public.departments"
}

// CreateDepartmentRequest represents the request body for creating a department
type CreateDepartmentRequest struct {
	Code        string  `json:"code" binding:"required,min=2,max=50"`
	Name        string  `json:"name" binding:"required,min=2,max=255"`
	SchoolID    *string `json:"school_id,omitempty" binding:"omitempty,len=36"`
	ParentID    *string `json:"parent_id,omitempty" binding:"omitempty,len=36"`
	Description *string `json:"description,omitempty"`
}

// UpdateDepartmentRequest represents the request body for updating a department
// Note: SchoolID and ParentID allow empty string to clear the field (backend converts "" to null)
type UpdateDepartmentRequest struct {
	Code        *string `json:"code,omitempty" binding:"omitempty,min=2,max=50"`
	Name        *string `json:"name,omitempty" binding:"omitempty,min=2,max=255"`
	SchoolID    *string `json:"school_id,omitempty"` // Validation in service layer - allows "" to clear
	ParentID    *string `json:"parent_id,omitempty"` // Validation in service layer - allows "" to clear
	Description *string `json:"description,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

// DepartmentResponse represents the response body for department data
type DepartmentResponse struct {
	ID          string              `json:"id"`
	Code        string              `json:"code"`
	Name        string              `json:"name"`
	SchoolID    *string             `json:"school_id,omitempty"`
	ParentID    *string             `json:"parent_id,omitempty"`
	Description *string             `json:"description,omitempty"`
	IsActive    bool                `json:"is_active"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
	CreatedBy   *string             `json:"created_by,omitempty"`
	ModifiedBy  *string             `json:"modified_by,omitempty"`
	School      *SchoolListResponse `json:"school,omitempty"`
	Parent      *DepartmentListResponse `json:"parent,omitempty"`
}

// DepartmentListResponse represents the response for listing departments
type DepartmentListResponse struct {
	ID         string  `json:"id"`
	Code       string  `json:"code"`
	Name       string  `json:"name"`
	SchoolID   *string `json:"school_id,omitempty"`
	ParentID   *string `json:"parent_id,omitempty"`
	ParentName *string `json:"parent_name,omitempty"`
	IsActive   bool    `json:"is_active"`
}

// DepartmentTreeResponse represents a department in a tree structure
type DepartmentTreeResponse struct {
	ID          string                    `json:"id"`
	Code        string                    `json:"code"`
	Name        string                    `json:"name"`
	Description *string                   `json:"description,omitempty"`
	IsActive    bool                      `json:"is_active"`
	Children    []*DepartmentTreeResponse `json:"children,omitempty"`
}

// ToResponse converts Department to DepartmentResponse
func (d *Department) ToResponse() *DepartmentResponse {
	resp := &DepartmentResponse{
		ID:          d.ID,
		Code:        d.Code,
		Name:        d.Name,
		SchoolID:    d.SchoolID,
		ParentID:    d.ParentID,
		Description: d.Description,
		IsActive:    d.IsActive,
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
		CreatedBy:   d.CreatedBy,
		ModifiedBy:  d.ModifiedBy,
	}

	if d.School != nil {
		resp.School = d.School.ToListResponse()
	}

	if d.Parent != nil {
		resp.Parent = d.Parent.ToListResponse()
	}

	return resp
}

// ToListResponse converts Department to DepartmentListResponse
func (d *Department) ToListResponse() *DepartmentListResponse {
	resp := &DepartmentListResponse{
		ID:       d.ID,
		Code:     d.Code,
		Name:     d.Name,
		SchoolID: d.SchoolID,
		ParentID: d.ParentID,
		IsActive: d.IsActive,
	}

	// Include parent name if Parent relation is loaded
	if d.Parent != nil {
		resp.ParentName = &d.Parent.Name
	}

	return resp
}

// ToTreeResponse converts Department to DepartmentTreeResponse
func (d *Department) ToTreeResponse() *DepartmentTreeResponse {
	resp := &DepartmentTreeResponse{
		ID:          d.ID,
		Code:        d.Code,
		Name:        d.Name,
		Description: d.Description,
		IsActive:    d.IsActive,
	}

	if len(d.Children) > 0 {
		resp.Children = make([]*DepartmentTreeResponse, len(d.Children))
		for i, child := range d.Children {
			resp.Children[i] = child.ToTreeResponse()
		}
	}

	return resp
}

// HasCircularReference checks if setting the given parentID would create a circular reference
func (d *Department) HasCircularReference(parentID string, allDepartments map[string]*Department) bool {
	if d.ID == parentID {
		return true
	}

	parent, exists := allDepartments[parentID]
	if !exists {
		return false
	}

	visited := make(map[string]bool)
	current := parent
	for current != nil {
		if visited[current.ID] {
			return true
		}
		if current.ID == d.ID {
			return true
		}
		visited[current.ID] = true
		if current.ParentID == nil {
			break
		}
		current = allDepartments[*current.ParentID]
	}

	return false
}
