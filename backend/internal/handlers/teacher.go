package handlers

import (
	"github.com/gin-gonic/gin"
)

func CreateTeacher(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Create teacher - to be implemented"})
}

func GetTeachers(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Get teachers - to be implemented"})
}

func GetTeacher(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Get teacher - to be implemented"})
}

func UpdateTeacher(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Update teacher - to be implemented"})
}

func DeleteTeacher(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Delete teacher - to be implemented"})
}
