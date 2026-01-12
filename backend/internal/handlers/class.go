package handlers

import (
	"github.com/gin-gonic/gin"
)

func CreateClass(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Create class - to be implemented"})
}

func GetClasses(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Get classes - to be implemented"})
}

func GetClass(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Get class - to be implemented"})
}

func UpdateClass(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Update class - to be implemented"})
}

func DeleteClass(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Delete class - to be implemented"})
}
