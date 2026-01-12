package handlers

import (
	"github.com/gin-gonic/gin"
)

func GetUsers(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Get users - to be implemented"})
}

func GetUser(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Get user - to be implemented"})
}

func UpdateUser(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Update user - to be implemented"})
}

func DeleteUser(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Delete user - to be implemented"})
}
