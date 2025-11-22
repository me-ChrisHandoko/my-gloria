package domain

import (
	"time"

	"gorm.io/gorm"
)

// User represents the user entity
type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Name      string         `json:"name" gorm:"size:255;not null"`
	Email     string         `json:"email" gorm:"size:255;uniqueIndex;not null"`
	Password  string         `json:"-" gorm:"size:255;not null"` // "-" hides from JSON
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// TableName specifies the table name for User
func (User) TableName() string {
	return "users"
}

// CreateUserRequest represents the request body for creating a user
type CreateUserRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=255"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// UpdateUserRequest represents the request body for updating a user
type UpdateUserRequest struct {
	Name  string `json:"name" binding:"omitempty,min=2,max=255"`
	Email string `json:"email" binding:"omitempty,email"`
}

// UserResponse represents the response body for user data
type UserResponse struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ToResponse converts User to UserResponse
func (u *User) ToResponse() *UserResponse {
	return &UserResponse{
		ID:        u.ID,
		Name:      u.Name,
		Email:     u.Email,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}
