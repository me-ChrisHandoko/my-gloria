package repository

import (
	"backend/internal/domain"

	"gorm.io/gorm"
)

// UserRepository defines the interface for user data access
type UserRepository interface {
	FindAll() ([]domain.User, error)
	FindByID(id uint) (*domain.User, error)
	FindByEmail(email string) (*domain.User, error)
	Create(user *domain.User) error
	Update(user *domain.User) error
	Delete(id uint) error
}

// userRepository implements UserRepository
type userRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository instance
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

// FindAll retrieves all users
func (r *userRepository) FindAll() ([]domain.User, error) {
	var users []domain.User
	if err := r.db.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

// FindByID retrieves a user by ID
func (r *userRepository) FindByID(id uint) (*domain.User, error) {
	var user domain.User
	if err := r.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByEmail retrieves a user by email
func (r *userRepository) FindByEmail(email string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// Create creates a new user
func (r *userRepository) Create(user *domain.User) error {
	return r.db.Create(user).Error
}

// Update updates an existing user
func (r *userRepository) Update(user *domain.User) error {
	return r.db.Save(user).Error
}

// Delete soft deletes a user by ID
func (r *userRepository) Delete(id uint) error {
	return r.db.Delete(&domain.User{}, id).Error
}
