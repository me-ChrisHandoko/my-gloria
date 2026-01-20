package models

import (
	"time"
)

// School represents a school/educational institution entity
type School struct {
	ID         string    `json:"id" gorm:"type:varchar(36);primaryKey"`
	Code       string    `json:"code" gorm:"type:varchar(50);uniqueIndex;not null"`
	Name       string    `json:"name" gorm:"type:varchar(255);not null"`
	Lokasi     *string   `json:"lokasi,omitempty" gorm:"type:varchar(100)"`
	Address    *string   `json:"address,omitempty" gorm:"type:text"`
	Phone      *string   `json:"phone,omitempty" gorm:"type:varchar(20)"`
	Email      *string   `json:"email,omitempty" gorm:"type:varchar(100)"`
	Principal  *string   `json:"principal,omitempty" gorm:"type:varchar(255)"`
	IsActive   bool      `json:"is_active" gorm:"column:is_active;default:true"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	CreatedBy  *string   `json:"created_by,omitempty" gorm:"column:created_by;type:varchar(36)"`
	ModifiedBy *string   `json:"modified_by,omitempty" gorm:"column:modified_by;type:varchar(36)"`

	// Relations
	Departments []Department `json:"departments,omitempty" gorm:"foreignKey:SchoolID"`
	Positions   []Position   `json:"positions,omitempty" gorm:"foreignKey:SchoolID"`
}

// TableName specifies the table name for School
func (School) TableName() string {
	return "public.schools"
}

// CreateSchoolRequest represents the request body for creating a school
type CreateSchoolRequest struct {
	Code      string  `json:"code" binding:"required,min=2,max=50"`
	Name      string  `json:"name" binding:"required,min=2,max=255"`
	Lokasi    string  `json:"lokasi" binding:"required,oneof=Barat Timur"`
	Address   *string `json:"address,omitempty"`
	Phone     *string `json:"phone,omitempty" binding:"omitempty,max=20"`
	Email     *string `json:"email,omitempty" binding:"omitempty,email,max=100"`
	Principal *string `json:"principal,omitempty" binding:"omitempty,max=255"`
}

// UpdateSchoolRequest represents the request body for updating a school
type UpdateSchoolRequest struct {
	Code      *string `json:"code,omitempty" binding:"omitempty,min=2,max=50"`
	Name      *string `json:"name,omitempty" binding:"omitempty,min=2,max=255"`
	Lokasi    *string `json:"lokasi,omitempty" binding:"omitempty,oneof=Barat Timur"`
	Address   *string `json:"address,omitempty"`
	Phone     *string `json:"phone,omitempty" binding:"omitempty,max=20"`
	Email     *string `json:"email,omitempty" binding:"omitempty,email,max=100"`
	Principal *string `json:"principal,omitempty" binding:"omitempty,max=255"`
	IsActive  *bool   `json:"is_active,omitempty"`
}

// SchoolResponse represents the response body for school data
type SchoolResponse struct {
	ID         string    `json:"id"`
	Code       string    `json:"code"`
	Name       string    `json:"name"`
	Lokasi     *string   `json:"lokasi,omitempty"`
	Address    *string   `json:"address,omitempty"`
	Phone      *string   `json:"phone,omitempty"`
	Email      *string   `json:"email,omitempty"`
	Principal  *string   `json:"principal,omitempty"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	CreatedBy  *string   `json:"created_by,omitempty"`
	ModifiedBy *string   `json:"modified_by,omitempty"`
}

// SchoolListResponse represents the response for listing schools
type SchoolListResponse struct {
	ID       string  `json:"id"`
	Code     string  `json:"code"`
	Name     string  `json:"name"`
	Lokasi   *string `json:"lokasi,omitempty"`
	IsActive bool    `json:"is_active"`
}

// ToResponse converts School to SchoolResponse
func (s *School) ToResponse() *SchoolResponse {
	return &SchoolResponse{
		ID:         s.ID,
		Code:       s.Code,
		Name:       s.Name,
		Lokasi:     s.Lokasi,
		Address:    s.Address,
		Phone:      s.Phone,
		Email:      s.Email,
		Principal:  s.Principal,
		IsActive:   s.IsActive,
		CreatedAt:  s.CreatedAt,
		UpdatedAt:  s.UpdatedAt,
		CreatedBy:  s.CreatedBy,
		ModifiedBy: s.ModifiedBy,
	}
}

// ToListResponse converts School to SchoolListResponse
func (s *School) ToListResponse() *SchoolListResponse {
	return &SchoolListResponse{
		ID:       s.ID,
		Code:     s.Code,
		Name:     s.Name,
		Lokasi:   s.Lokasi,
		IsActive: s.IsActive,
	}
}
