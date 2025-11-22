package handler

import (
	"errors"
	"net/http"
	"strconv"

	"backend/internal/domain"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// UserHandler handles HTTP requests for users
type UserHandler struct {
	service service.UserService
}

// NewUserHandler creates a new user handler instance
func NewUserHandler(service service.UserService) *UserHandler {
	return &UserHandler{service: service}
}

// GetAll handles GET /users
func (h *UserHandler) GetAll(c *gin.Context) {
	users, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve users",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": users,
	})
}

// GetByID handles GET /users/:id
func (h *UserHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	user, err := h.service.GetByID(uint(id))
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": user,
	})
}

// Create handles POST /users
func (h *UserHandler) Create(c *gin.Context) {
	var req domain.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	user, err := h.service.Create(&req)
	if err != nil {
		if errors.Is(err, service.ErrEmailExists) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Email already exists",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create user",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    user,
		"message": "User created successfully",
	})
}

// Update handles PUT /users/:id
func (h *UserHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	var req domain.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	user, err := h.service.Update(uint(id), &req)
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User not found",
			})
			return
		}
		if errors.Is(err, service.ErrEmailExists) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Email already exists",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    user,
		"message": "User updated successfully",
	})
}

// Delete handles DELETE /users/:id
func (h *UserHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	if err := h.service.Delete(uint(id)); err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User deleted successfully",
	})
}
