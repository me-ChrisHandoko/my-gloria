package handler

import (
	"errors"
	"net/http"

	"backend/internal/domain"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// UserProfileHandler handles HTTP requests for user profiles
type UserProfileHandler struct {
	service service.UserProfileService
}

// NewUserProfileHandler creates a new user profile handler instance
func NewUserProfileHandler(service service.UserProfileService) *UserProfileHandler {
	return &UserProfileHandler{service: service}
}

// GetAll handles GET /user-profiles
func (h *UserProfileHandler) GetAll(c *gin.Context) {
	profiles, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve user profiles",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": profiles,
	})
}

// GetByID handles GET /user-profiles/:id
func (h *UserProfileHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user profile ID",
		})
		return
	}

	profile, err := h.service.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User profile not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve user profile",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": profile,
	})
}

// GetByClerkUserID handles GET /user-profiles/clerk/:clerkUserId
func (h *UserProfileHandler) GetByClerkUserID(c *gin.Context) {
	clerkUserID := c.Param("clerkUserId")
	if clerkUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid Clerk user ID",
		})
		return
	}

	profile, err := h.service.GetByClerkUserID(clerkUserID)
	if err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User profile not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve user profile",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": profile,
	})
}

// GetByNIP handles GET /user-profiles/nip/:nip
func (h *UserProfileHandler) GetByNIP(c *gin.Context) {
	nip := c.Param("nip")
	if nip == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid NIP",
		})
		return
	}

	profile, err := h.service.GetByNIP(nip)
	if err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User profile not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve user profile",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": profile,
	})
}

// GetWithFullDetails handles GET /user-profiles/:id/full
func (h *UserProfileHandler) GetWithFullDetails(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user profile ID",
		})
		return
	}

	profile, err := h.service.GetWithFullDetails(id)
	if err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User profile not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve user profile details",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": profile,
	})
}

// Create handles POST /user-profiles
func (h *UserProfileHandler) Create(c *gin.Context) {
	var req domain.CreateUserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// TODO: Get createdBy from authentication context
	var createdBy *string

	profile, err := h.service.Create(&req, createdBy)
	if err != nil {
		if errors.Is(err, service.ErrNIPExists) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "NIP already exists",
			})
			return
		}
		if errors.Is(err, service.ErrClerkUserIDExists) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Clerk user ID already exists",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create user profile",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    profile,
		"message": "User profile created successfully",
	})
}

// Update handles PUT /user-profiles/:id
func (h *UserProfileHandler) Update(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user profile ID",
		})
		return
	}

	var req domain.UpdateUserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	profile, err := h.service.Update(id, &req)
	if err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User profile not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update user profile",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    profile,
		"message": "User profile updated successfully",
	})
}

// Delete handles DELETE /user-profiles/:id
func (h *UserProfileHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user profile ID",
		})
		return
	}

	if err := h.service.Delete(id); err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User profile not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete user profile",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User profile deleted successfully",
	})
}
