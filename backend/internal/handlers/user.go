package handlers

import (
	"net/http"
	"strconv"

	"backend/internal/models"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
)

// UserHandler handles HTTP requests for users
type UserHandler struct {
	userService *services.UserService
}

// NewUserHandler creates a new UserHandler instance
func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// GetUsers handles getting list of users with pagination and filters
// @Summary Get list of users
// @Tags users
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Param search query string false "Search by email or username"
// @Param role_id query string false "Filter by role ID"
// @Param is_active query bool false "Filter by active status"
// @Param sort_by query string false "Sort by field" default(email)
// @Param sort_order query string false "Sort order (asc/desc)" default(asc)
// @Success 200 {object} services.UserListResult
// @Failure 500 {object} map[string]string
// @Router /users [get]
func (h *UserHandler) GetUsers(c *gin.Context) {
	// HTTP: Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
	roleID := c.Query("role_id")
	sortBy := c.DefaultQuery("sort_by", "email")
	sortOrder := c.DefaultQuery("sort_order", "asc")

	// HTTP: Parse is_active filter
	var isActive *bool
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		val, _ := strconv.ParseBool(isActiveStr)
		isActive = &val
	}

	// Build params
	params := services.UserListParams{
		Page:      page,
		PageSize:  pageSize,
		Search:    search,
		RoleID:    roleID,
		IsActive:  isActive,
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}

	// Business logic: Get users via service
	result, err := h.userService.GetUsers(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{
		"data":        result.Data,
		"total":       result.Total,
		"page":        result.Page,
		"page_size":   result.PageSize,
		"total_pages": result.TotalPages,
	})
}

// GetUser handles getting a single user by ID
// @Summary Get user by ID
// @Tags users
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} models.UserResponse
// @Failure 404 {object} map[string]string
// @Router /users/{id} [get]
func (h *UserHandler) GetUser(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// Business logic: Get user via service
	user, err := h.userService.GetUserByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, user.ToResponse())
}

// UpdateUser handles updating a user
// @Summary Update a user
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param request body models.UpdateUserRequest true "User data"
// @Success 200 {object} models.UserResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /users/{id} [put]
func (h *UserHandler) UpdateUser(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// HTTP: Parse and validate request
	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Business logic: Update user via service
	user, err := h.userService.UpdateUser(id, req, userID.(string))
	if err != nil {
		if err.Error() == "pengguna tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, user.ToResponse())
}

// DeleteUser handles deleting a user
// @Summary Delete a user
// @Tags users
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /users/{id} [delete]
func (h *UserHandler) DeleteUser(c *gin.Context) {
	// HTTP: Get ID from URL
	id := c.Param("id")

	// HTTP: Get authenticated user (prevent self-deletion)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Business rule: Cannot delete yourself
	if id == userID.(string) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak dapat menghapus akun sendiri"})
		return
	}

	// Business logic: Delete user via service
	err := h.userService.DeleteUser(id)
	if err != nil {
		if err.Error() == "pengguna tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "Pengguna berhasil dihapus"})
}

// GetUserRoles handles getting all roles assigned to a user
// @Summary Get user roles
// @Tags users
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {array} models.UserRoleResponse
// @Failure 404 {object} map[string]string
// @Router /users/{id}/roles [get]
func (h *UserHandler) GetUserRoles(c *gin.Context) {
	// HTTP: Get user ID from URL
	userID := c.Param("id")

	// Business logic: Get user roles via service
	roles, err := h.userService.GetUserRoles(userID)
	if err != nil {
		if err.Error() == "pengguna tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, roles)
}

// AssignRoleToUser handles assigning a role to a user
// @Summary Assign role to user
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param request body models.AssignRoleToUserRequest true "Role assignment data"
// @Success 201 {object} models.UserRoleResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /users/{id}/roles [post]
func (h *UserHandler) AssignRoleToUser(c *gin.Context) {
	// HTTP: Get user ID from URL
	userID := c.Param("id")

	// HTTP: Parse and validate request
	var req models.AssignRoleToUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Get authenticated user (who is assigning the role)
	assignedBy, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Business logic: Assign role to user via service
	roleResponse, err := h.userService.AssignRoleToUser(userID, req, assignedBy.(string))
	if err != nil {
		if err.Error() == "pengguna tidak ditemukan" || err.Error() == "role tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if err.Error() == "role sudah di-assign ke pengguna ini" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusCreated, roleResponse)
}

// RevokeRoleFromUser handles revoking a role from a user
// @Summary Revoke role from user
// @Tags users
// @Produce json
// @Param id path string true "User ID"
// @Param role_id path string true "Role Assignment ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /users/{id}/roles/{role_id} [delete]
func (h *UserHandler) RevokeRoleFromUser(c *gin.Context) {
	// HTTP: Get IDs from URL
	userID := c.Param("id")
	roleAssignmentID := c.Param("role_id")

	// Business logic: Revoke role from user via service
	err := h.userService.RevokeRoleFromUser(userID, roleAssignmentID)
	if err != nil {
		if err.Error() == "pengguna tidak ditemukan" || err.Error() == "role assignment tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "Role berhasil di-revoke dari pengguna"})
}

// GetUserPositions handles getting all positions assigned to a user
// @Summary Get user positions
// @Tags users
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {array} models.UserPositionResponse
// @Failure 404 {object} map[string]string
// @Router /users/{id}/positions [get]
func (h *UserHandler) GetUserPositions(c *gin.Context) {
	// HTTP: Get user ID from URL
	userID := c.Param("id")

	// Business logic: Get user positions via service
	positions, err := h.userService.GetUserPositions(userID)
	if err != nil {
		if err.Error() == "pengguna tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, positions)
}

// AssignPositionToUser handles assigning a position to a user
// @Summary Assign position to user
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param request body models.AssignPositionToUserRequest true "Position assignment data"
// @Success 201 {object} models.UserPositionResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /users/{id}/positions [post]
func (h *UserHandler) AssignPositionToUser(c *gin.Context) {
	// HTTP: Get user ID from URL
	userID := c.Param("id")

	// HTTP: Parse and validate request
	var req models.AssignPositionToUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Get authenticated user (who is assigning the position)
	appointedBy, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Business logic: Assign position to user via service
	positionResponse, err := h.userService.AssignPositionToUser(userID, req, appointedBy.(string))
	if err != nil {
		if err.Error() == "pengguna tidak ditemukan" || err.Error() == "posisi tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if err.Error() == "posisi sudah di-assign ke pengguna ini" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusCreated, positionResponse)
}

// RevokePositionFromUser handles revoking a position from a user
// @Summary Revoke position from user
// @Tags users
// @Produce json
// @Param id path string true "User ID"
// @Param position_id path string true "Position Assignment ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /users/{id}/positions/{position_id} [delete]
func (h *UserHandler) RevokePositionFromUser(c *gin.Context) {
	// HTTP: Get IDs from URL
	userID := c.Param("id")
	positionAssignmentID := c.Param("position_id")

	// Business logic: Revoke position from user via service
	err := h.userService.RevokePositionFromUser(userID, positionAssignmentID)
	if err != nil {
		if err.Error() == "pengguna tidak ditemukan" || err.Error() == "position assignment tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "Posisi berhasil di-revoke dari pengguna"})
}

// GetUserPermissions handles getting all direct permissions assigned to a user
// @Summary Get user direct permissions
// @Tags users
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {array} models.UserPermissionResponse
// @Failure 404 {object} map[string]string
// @Router /users/{id}/permissions [get]
func (h *UserHandler) GetUserPermissions(c *gin.Context) {
	// HTTP: Get user ID from URL
	userID := c.Param("id")

	// Business logic: Get user permissions via service
	permissions, err := h.userService.GetUserPermissions(userID)
	if err != nil {
		if err.Error() == "pengguna tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, permissions)
}

// AssignPermissionToUser handles assigning a direct permission to a user
// @Summary Assign permission to user
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param request body models.AssignPermissionToUserRequest true "Permission assignment data"
// @Success 201 {object} models.UserPermissionResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /users/{id}/permissions [post]
func (h *UserHandler) AssignPermissionToUser(c *gin.Context) {
	// HTTP: Get user ID from URL
	userID := c.Param("id")

	// HTTP: Parse and validate request
	var req models.AssignPermissionToUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HTTP: Get authenticated user (who is granting the permission)
	grantedBy, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Business logic: Assign permission to user via service
	permissionResponse, err := h.userService.AssignPermissionToUser(userID, req, grantedBy.(string))
	if err != nil {
		if err.Error() == "pengguna tidak ditemukan" || err.Error() == "permission tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusCreated, permissionResponse)
}

// RevokePermissionFromUser handles revoking a direct permission from a user
// @Summary Revoke permission from user
// @Tags users
// @Produce json
// @Param id path string true "User ID"
// @Param permission_id path string true "Permission Assignment ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /users/{id}/permissions/{permission_id} [delete]
func (h *UserHandler) RevokePermissionFromUser(c *gin.Context) {
	// HTTP: Get IDs from URL
	userID := c.Param("id")
	permissionAssignmentID := c.Param("permission_id")

	// Business logic: Revoke permission from user via service
	err := h.userService.RevokePermissionFromUser(userID, permissionAssignmentID)
	if err != nil {
		if err.Error() == "pengguna tidak ditemukan" || err.Error() == "permission assignment tidak ditemukan" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	// HTTP: Format response
	c.JSON(http.StatusOK, gin.H{"message": "Permission berhasil di-revoke dari pengguna"})
}
