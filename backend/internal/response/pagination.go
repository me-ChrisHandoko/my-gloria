package response

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// PaginationParams holds pagination parameters from query
type PaginationParams struct {
	Page   int    `form:"page"`
	Limit  int    `form:"limit"`
	Search string `form:"search"`
}

// PaginationMeta holds pagination metadata for response
type PaginationMeta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int64 `json:"total_pages"`
}

// PaginatedResponse represents a paginated API response
type PaginatedResponse struct {
	Success bool           `json:"success"`
	Data    interface{}    `json:"data"`
	Meta    PaginationMeta `json:"meta"`
}

// DefaultPage is the default page number
const DefaultPage = 1

// DefaultLimit is the default items per page
const DefaultLimit = 20

// MaxLimit is the maximum allowed items per page
const MaxLimit = 100

// GetPaginationParams extracts and validates pagination parameters from request
func GetPaginationParams(c *gin.Context) PaginationParams {
	page := parseIntWithDefault(c.Query("page"), DefaultPage)
	limit := parseIntWithDefault(c.Query("limit"), DefaultLimit)
	search := c.Query("search")

	// Ensure page is at least 1
	if page < 1 {
		page = DefaultPage
	}

	// Ensure limit is within bounds
	if limit < 1 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}

	return PaginationParams{
		Page:   page,
		Limit:  limit,
		Search: search,
	}
}

// GetOffset calculates the offset for database queries
func (p PaginationParams) GetOffset() int {
	return (p.Page - 1) * p.Limit
}

// Paginated sends a paginated success response
func Paginated(c *gin.Context, status int, data interface{}, total int64, params PaginationParams) {
	totalPages := (total + int64(params.Limit) - 1) / int64(params.Limit)
	if totalPages < 0 {
		totalPages = 0
	}

	c.JSON(status, PaginatedResponse{
		Success: true,
		Data:    data,
		Meta: PaginationMeta{
			Page:       params.Page,
			Limit:      params.Limit,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// parseIntWithDefault parses a string to int with a default value
func parseIntWithDefault(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(s)
	if err != nil {
		return defaultVal
	}
	return val
}
