package handlers

import (
	"github.com/gin-gonic/gin"
)

func CreateStudent(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Create student - to be implemented"})
}

func GetStudents(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Get students - to be implemented"})
}

func GetStudent(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Get student - to be implemented"})
}

func UpdateStudent(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Update student - to be implemented"})
}

func DeleteStudent(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Delete student - to be implemented"})
}
