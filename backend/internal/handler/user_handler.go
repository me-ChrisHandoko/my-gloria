package handler

import (
	"errors"
	"net/http"

	"backend/internal/domain"
	"backend/internal/response"
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

// GetAll handles GET /user-profiles with pagination
func (h *UserProfileHandler) GetAll(c *gin.Context) {
	params := response.GetPaginationParams(c)

	profiles, total, err := h.service.GetAllPaginated(params.Page, params.Limit, params.Search)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve user profiles")
		return
	}

	response.Paginated(c, http.StatusOK, profiles, total, params)
}

// GetByID handles GET /user-profiles/:id
func (h *UserProfileHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID")
		return
	}

	profile, err := h.service.GetByID(id)
	if err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			ErrorResponse(c, http.StatusNotFound, "User profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve user profile")
		return
	}

	SuccessResponse(c, http.StatusOK, "", profile)
}

// GetByClerkUserID handles GET /user-profiles/clerk/:clerkUserId
func (h *UserProfileHandler) GetByClerkUserID(c *gin.Context) {
	clerkUserID := c.Param("clerkUserId")
	if clerkUserID == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid Clerk user ID")
		return
	}

	profile, err := h.service.GetByClerkUserID(clerkUserID)
	if err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			ErrorResponse(c, http.StatusNotFound, "User profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve user profile")
		return
	}

	SuccessResponse(c, http.StatusOK, "", profile)
}

// GetByNIP handles GET /user-profiles/nip/:nip
func (h *UserProfileHandler) GetByNIP(c *gin.Context) {
	nip := c.Param("nip")
	if nip == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid NIP")
		return
	}

	profile, err := h.service.GetByNIP(nip)
	if err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			ErrorResponse(c, http.StatusNotFound, "User profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve user profile")
		return
	}

	SuccessResponse(c, http.StatusOK, "", profile)
}

// GetWithFullDetails handles GET /user-profiles/:id/full
func (h *UserProfileHandler) GetWithFullDetails(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID")
		return
	}

	profile, err := h.service.GetWithFullDetails(id)
	if err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			ErrorResponse(c, http.StatusNotFound, "User profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve user profile details")
		return
	}

	SuccessResponse(c, http.StatusOK, "", profile)
}

// Create handles POST /user-profiles
func (h *UserProfileHandler) Create(c *gin.Context) {
	var req domain.CreateUserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// TODO: Get createdBy from authentication context
	var createdBy *string

	profile, err := h.service.Create(&req, createdBy)
	if err != nil {
		if errors.Is(err, service.ErrNIPExists) {
			ErrorResponse(c, http.StatusConflict, "NIP already exists")
			return
		}
		if errors.Is(err, service.ErrClerkUserIDExists) {
			ErrorResponse(c, http.StatusConflict, "Clerk user ID already exists")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to create user profile")
		return
	}

	SuccessResponse(c, http.StatusCreated, "User profile created successfully", profile)
}

// Update handles PUT /user-profiles/:id
func (h *UserProfileHandler) Update(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID")
		return
	}

	var req domain.UpdateUserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	profile, err := h.service.Update(id, &req)
	if err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			ErrorResponse(c, http.StatusNotFound, "User profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to update user profile")
		return
	}

	SuccessResponse(c, http.StatusOK, "User profile updated successfully", profile)
}

// Delete handles DELETE /user-profiles/:id
func (h *UserProfileHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID")
		return
	}

	if err := h.service.Delete(id); err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			ErrorResponse(c, http.StatusNotFound, "User profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to delete user profile")
		return
	}

	SuccessResponse(c, http.StatusOK, "User profile deleted successfully", nil)
}

// AssignRole handles POST /user-profiles/:id/roles
func (h *UserProfileHandler) AssignRole(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID")
		return
	}

	var req domain.AssignRoleToUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Get assigned by from auth context
	var assignedBy *string
	if userID, exists := c.Get("auth_context"); exists {
		if authCtx, ok := userID.(interface{ GetUserID() string }); ok {
			uid := authCtx.GetUserID()
			assignedBy = &uid
		}
	}

	role, err := h.service.AssignRole(id, &req, assignedBy)
	if err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			ErrorResponse(c, http.StatusNotFound, "User profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to assign role")
		return
	}

	SuccessResponse(c, http.StatusCreated, "Role assigned successfully", role)
}

// RemoveRole handles DELETE /user-profiles/:id/roles/:roleId
func (h *UserProfileHandler) RemoveRole(c *gin.Context) {
	id := c.Param("id")
	roleID := c.Param("roleId")
	if id == "" || roleID == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID or role ID")
		return
	}

	if err := h.service.RemoveRole(id, roleID); err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			ErrorResponse(c, http.StatusNotFound, "User profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to remove role")
		return
	}

	SuccessResponse(c, http.StatusOK, "Role removed successfully", nil)
}

// GetUserRoles handles GET /user-profiles/:id/roles
func (h *UserProfileHandler) GetUserRoles(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID")
		return
	}

	roles, err := h.service.GetUserRoles(id)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, "Failed to get user roles")
		return
	}

	SuccessResponse(c, http.StatusOK, "", roles)
}

// AssignPosition handles POST /user-profiles/:id/positions
func (h *UserProfileHandler) AssignPosition(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID")
		return
	}

	var req domain.AssignPositionToUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Get appointed by from auth context
	var appointedBy *string
	if userID, exists := c.Get("auth_context"); exists {
		if authCtx, ok := userID.(interface{ GetUserID() string }); ok {
			uid := authCtx.GetUserID()
			appointedBy = &uid
		}
	}

	position, err := h.service.AssignPosition(id, &req, appointedBy)
	if err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			ErrorResponse(c, http.StatusNotFound, "User profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to assign position")
		return
	}

	SuccessResponse(c, http.StatusCreated, "Position assigned successfully", position)
}

// RemovePosition handles DELETE /user-profiles/:id/positions/:positionId
func (h *UserProfileHandler) RemovePosition(c *gin.Context) {
	id := c.Param("id")
	positionID := c.Param("positionId")
	if id == "" || positionID == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID or position ID")
		return
	}

	if err := h.service.RemovePosition(id, positionID); err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			ErrorResponse(c, http.StatusNotFound, "User profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to remove position")
		return
	}

	SuccessResponse(c, http.StatusOK, "Position removed successfully", nil)
}

// GetUserPositions handles GET /user-profiles/:id/positions
func (h *UserProfileHandler) GetUserPositions(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID")
		return
	}

	positions, err := h.service.GetUserPositions(id)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, "Failed to get user positions")
		return
	}

	SuccessResponse(c, http.StatusOK, "", positions)
}

// GrantPermission handles POST /user-profiles/:id/permissions
func (h *UserProfileHandler) GrantPermission(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID")
		return
	}

	var req domain.AssignPermissionToUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Get granted by from auth context (required)
	grantedBy := ""
	if userID, exists := c.Get("auth_context"); exists {
		if authCtx, ok := userID.(interface{ GetUserID() string }); ok {
			grantedBy = authCtx.GetUserID()
		}
	}
	if grantedBy == "" {
		ErrorResponse(c, http.StatusBadRequest, "Cannot determine granting user")
		return
	}

	if err := h.service.GrantPermission(id, &req, grantedBy); err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			ErrorResponse(c, http.StatusNotFound, "User profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to grant permission")
		return
	}

	SuccessResponse(c, http.StatusCreated, "Permission granted successfully", nil)
}

// RevokePermission handles DELETE /user-profiles/:id/permissions/:permissionId
func (h *UserProfileHandler) RevokePermission(c *gin.Context) {
	id := c.Param("id")
	permissionID := c.Param("permissionId")
	if id == "" || permissionID == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID or permission ID")
		return
	}

	if err := h.service.RevokePermission(id, permissionID); err != nil {
		if errors.Is(err, service.ErrUserProfileNotFound) {
			ErrorResponse(c, http.StatusNotFound, "User profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, "Failed to revoke permission")
		return
	}

	SuccessResponse(c, http.StatusOK, "Permission revoked successfully", nil)
}

// GetUserDirectPermissions handles GET /user-profiles/:id/permissions
func (h *UserProfileHandler) GetUserDirectPermissions(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		ErrorResponse(c, http.StatusBadRequest, "Invalid user profile ID")
		return
	}

	permissions, err := h.service.GetUserDirectPermissions(id)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, "Failed to get user permissions")
		return
	}

	SuccessResponse(c, http.StatusOK, "", permissions)
}
