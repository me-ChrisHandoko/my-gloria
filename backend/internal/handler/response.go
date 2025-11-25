package handler

import (
	"backend/internal/response"

	"github.com/gin-gonic/gin"
)

// Response represents a standard API response (aliased from response package)
type Response = response.Response

// SuccessResponse sends a success response (wrapper for backward compatibility)
func SuccessResponse(c *gin.Context, status int, message string, data interface{}) {
	response.Success(c, status, message, data)
}

// ErrorResponse sends an error response (wrapper for backward compatibility)
func ErrorResponse(c *gin.Context, status int, err string) {
	response.Error(c, status, err)
}
