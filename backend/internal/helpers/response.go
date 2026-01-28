// Package helpers - HTTP response helpers with i18n support
package helpers

import (
	"net/http"

	"backend/internal/i18n"

	"github.com/gin-gonic/gin"
)

// ErrorResponse sends a JSON error response with translated message.
// The response includes both the translated message and the message key for debugging.
//
// Response format:
//
//	{
//	    "error": "Translated error message",
//	    "code": "error.key"
//	}
func ErrorResponse(c *gin.Context, status int, key string) {
	c.JSON(status, gin.H{
		"error": i18n.T(c, key),
		"code":  key,
	})
}

// ErrorResponseF sends a JSON error response with formatted translated message.
// Use this when the message requires format arguments.
//
// Example:
//
//	ErrorResponseF(c, 400, "validation.min_length", "Password", 8)
//	// Result: {"error": "Password minimal 8 karakter", "code": "validation.min_length"}
func ErrorResponseF(c *gin.Context, status int, key string, args ...interface{}) {
	c.JSON(status, gin.H{
		"error": i18n.TF(c, key, args...),
		"code":  key,
	})
}

// ErrorResponseWithDetails sends a JSON error response with additional details.
// Useful for validation errors or when more context is needed.
//
// Response format:
//
//	{
//	    "error": "Translated error message",
//	    "code": "error.key",
//	    "details": {...}
//	}
func ErrorResponseWithDetails(c *gin.Context, status int, key string, details interface{}) {
	c.JSON(status, gin.H{
		"error":   i18n.T(c, key),
		"code":    key,
		"details": details,
	})
}

// SuccessResponse sends a JSON success response with translated message and data.
//
// Response format:
//
//	{
//	    "message": "Translated success message",
//	    "data": {...}
//	}
func SuccessResponse(c *gin.Context, status int, key string, data interface{}) {
	c.JSON(status, gin.H{
		"message": i18n.T(c, key),
		"data":    data,
	})
}

// SuccessResponseF sends a JSON success response with formatted translated message.
//
// Example:
//
//	SuccessResponseF(c, 201, "crud.created", "User", userData)
//	// Result: {"message": "User berhasil ditambahkan", "data": {...}}
func SuccessResponseF(c *gin.Context, status int, key string, data interface{}, args ...interface{}) {
	c.JSON(status, gin.H{
		"message": i18n.TF(c, key, args...),
		"data":    data,
	})
}

// DataResponse sends a JSON response with data only (no message).
// Use this for GET requests where a message is not necessary.
func DataResponse(c *gin.Context, status int, data interface{}) {
	c.JSON(status, gin.H{
		"data": data,
	})
}

// PaginatedResponse sends a JSON response with paginated data.
//
// Response format:
//
//	{
//	    "data": [...],
//	    "pagination": {
//	        "page": 1,
//	        "page_size": 10,
//	        "total": 100,
//	        "total_pages": 10
//	    }
//	}
func PaginatedResponse(c *gin.Context, data interface{}, page, pageSize int, total int64) {
	totalPages := int64(0)
	if pageSize > 0 {
		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": data,
		"pagination": gin.H{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// MessageOnlyResponse sends a JSON response with only a translated message.
// Use this for actions that don't return data (like delete operations).
func MessageOnlyResponse(c *gin.Context, status int, key string) {
	c.JSON(status, gin.H{
		"message": i18n.T(c, key),
	})
}

// MessageOnlyResponseF sends a JSON response with formatted translated message only.
func MessageOnlyResponseF(c *gin.Context, status int, key string, args ...interface{}) {
	c.JSON(status, gin.H{
		"message": i18n.TF(c, key, args...),
	})
}

// =============================================================================
// Common error responses (shortcuts)
// =============================================================================

// BadRequest sends a 400 Bad Request response
func BadRequest(c *gin.Context, key string) {
	ErrorResponse(c, http.StatusBadRequest, key)
}

// Unauthorized sends a 401 Unauthorized response
func Unauthorized(c *gin.Context, key string) {
	ErrorResponse(c, http.StatusUnauthorized, key)
}

// Forbidden sends a 403 Forbidden response
func Forbidden(c *gin.Context, key string) {
	ErrorResponse(c, http.StatusForbidden, key)
}

// NotFound sends a 404 Not Found response
func NotFound(c *gin.Context, key string) {
	ErrorResponse(c, http.StatusNotFound, key)
}

// Conflict sends a 409 Conflict response
func Conflict(c *gin.Context, key string) {
	ErrorResponse(c, http.StatusConflict, key)
}

// InternalError sends a 500 Internal Server Error response
func InternalError(c *gin.Context, key string) {
	ErrorResponse(c, http.StatusInternalServerError, key)
}

// ValidationError sends a 400 Bad Request response with validation details
func ValidationError(c *gin.Context, details interface{}) {
	ErrorResponseWithDetails(c, http.StatusBadRequest, i18n.MsgErrorBadRequest, details)
}
