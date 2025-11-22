package service

import (
	"errors"

	"backend/internal/domain"
	"backend/internal/repository"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrUserNotFound     = errors.New("user not found")
	ErrEmailExists      = errors.New("email already exists")
	ErrInvalidPassword  = errors.New("invalid password")
)

// UserService defines the interface for user business logic
type UserService interface {
	GetAll() ([]domain.UserResponse, error)
	GetByID(id uint) (*domain.UserResponse, error)
	Create(req *domain.CreateUserRequest) (*domain.UserResponse, error)
	Update(id uint, req *domain.UpdateUserRequest) (*domain.UserResponse, error)
	Delete(id uint) error
}

// userService implements UserService
type userService struct {
	repo repository.UserRepository
}

// NewUserService creates a new user service instance
func NewUserService(repo repository.UserRepository) UserService {
	return &userService{repo: repo}
}

// GetAll retrieves all users
func (s *userService) GetAll() ([]domain.UserResponse, error) {
	users, err := s.repo.FindAll()
	if err != nil {
		return nil, err
	}

	responses := make([]domain.UserResponse, len(users))
	for i, user := range users {
		responses[i] = *user.ToResponse()
	}
	return responses, nil
}

// GetByID retrieves a user by ID
func (s *userService) GetByID(id uint) (*domain.UserResponse, error) {
	user, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return user.ToResponse(), nil
}

// Create creates a new user
func (s *userService) Create(req *domain.CreateUserRequest) (*domain.UserResponse, error) {
	// Check if email already exists
	existing, err := s.repo.FindByEmail(req.Email)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, ErrEmailExists
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	if err := s.repo.Create(user); err != nil {
		return nil, err
	}

	return user.ToResponse(), nil
}

// Update updates an existing user
func (s *userService) Update(id uint, req *domain.UpdateUserRequest) (*domain.UserResponse, error) {
	user, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	// Check if new email is taken by another user
	if req.Email != "" && req.Email != user.Email {
		existing, err := s.repo.FindByEmail(req.Email)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if existing != nil && existing.ID != id {
			return nil, ErrEmailExists
		}
		user.Email = req.Email
	}

	if req.Name != "" {
		user.Name = req.Name
	}

	if err := s.repo.Update(user); err != nil {
		return nil, err
	}

	return user.ToResponse(), nil
}

// Delete deletes a user by ID
func (s *userService) Delete(id uint) error {
	_, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	return s.repo.Delete(id)
}
