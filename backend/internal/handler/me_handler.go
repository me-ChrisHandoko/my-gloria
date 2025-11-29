package handler

import (
	"net/http"

	"backend/internal/middleware"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// MeHandler handles current user context HTTP requests
type MeHandler struct {
	meService service.MeService
}

// NewMeHandler creates a new me handler instance
func NewMeHandler(meService service.MeService) *MeHandler {
	return &MeHandler{meService: meService}
}

// GetMe retrieves the complete context for the currently authenticated user
// @Summary Get current user context
// @Description Returns the complete user context including profile, employee data, roles, permissions, and accessible modules
// @Tags Me
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} Response{data=service.CurrentUserContext}
// @Failure 401 {object} Response
// @Failure 500 {object} Response
// @Router /api/v1/me [get]
func (h *MeHandler) GetMe(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		ErrorResponse(c, http.StatusUnauthorized, "user not authenticated")
		return
	}

	ctx, err := h.meService.GetCurrentUserContext(userID)
	if err != nil {
		if err == service.ErrUserProfileNotFound {
			ErrorResponse(c, http.StatusNotFound, "user profile not found")
			return
		}
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	SuccessResponse(c, http.StatusOK, "", ctx)
}

// GetMyPermissions retrieves all permissions for the currently authenticated user
// @Summary Get current user permissions
// @Description Returns all permission codes for the current user (direct + role-based)
// @Tags Me
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} Response{data=[]string}
// @Failure 401 {object} Response
// @Failure 500 {object} Response
// @Router /api/v1/me/permissions [get]
func (h *MeHandler) GetMyPermissions(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		ErrorResponse(c, http.StatusUnauthorized, "user not authenticated")
		return
	}

	permissions, err := h.meService.GetCurrentUserPermissions(userID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	SuccessResponse(c, http.StatusOK, "", permissions)
}

// GetMyModules retrieves all accessible modules for the currently authenticated user
// @Summary Get current user modules
// @Description Returns all modules the current user has access to (direct + role-based)
// @Tags Me
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} Response{data=[]service.ModuleInfo}
// @Failure 401 {object} Response
// @Failure 500 {object} Response
// @Router /api/v1/me/modules [get]
func (h *MeHandler) GetMyModules(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	if userID == "" {
		ErrorResponse(c, http.StatusUnauthorized, "user not authenticated")
		return
	}

	modules, err := h.meService.GetCurrentUserModules(userID)
	if err != nil {
		ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	SuccessResponse(c, http.StatusOK, "", modules)
}
