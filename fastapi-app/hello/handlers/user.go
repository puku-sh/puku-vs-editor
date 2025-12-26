package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"hello/config"
	"hello/models"
	"hello/utils"
)

// GetUsers returns all users
func GetUsers(c *gin.Context) {
	var users []models.User
	if err := config.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Database error",
			Message: err.Error(),
		})
		return
	}
	
	var userResponses []models.UserResponse
	for _, user := range users {
		userResponses = append(userResponses, utils.ToUserResponse(user))
	}
	
	c.JSON(http.StatusOK, gin.H{"users": userResponses, "count": len(userResponses)})
}

// GetUser returns a specific user by ID
func GetUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error: "User not found",
				Message: fmt.Sprintf("User with ID %s does not exist", id),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Database error",
			Message: err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, utils.ToUserResponse(user))
}

// CreateUser creates a new user
func CreateUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request data",
			Message: err.Error(),
		})
		return
	}
	
	// Check if user with same username or email already exists
	var existingUser models.User
	if err := config.DB.Where("username = ? OR email = ?", req.Username, req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, models.ErrorResponse{
			Error: "User already exists",
			Message: "A user with this username or email already exists",
		})
		return
	}
	
	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Password hashing failed",
			Message: err.Error(),
		})
		return
	}
	
	// Create user
	user := models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: hashedPassword,
		Phone:    req.Phone,
	}
	
	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to create user",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusCreated, utils.ToUserResponse(user))
}

// UpdateUser updates an existing user
func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error: "User not found",
				Message: fmt.Sprintf("User with ID %s does not exist", id),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Database error",
			Message: err.Error(),
		})
		return
	}
	
	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request data",
			Message: err.Error(),
		})
		return
	}
	
	// Check for username/email conflicts (excluding current user)
	if req.Username != "" || req.Email != "" {
		var existingUser models.User
		query := config.DB.Where("id != ?", user.ID)
		if req.Username != "" {
			query = query.Or("username = ?", req.Username)
		}
		if req.Email != "" {
			query = query.Or("email = ?", req.Email)
		}
		if err := query.First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, models.ErrorResponse{
				Error: "User already exists",
				Message: "A user with this username or email already exists",
			})
			return
		}
	}
	
	// Update fields if provided
	if req.Username != "" {
		user.Username = req.Username
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	
	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to update user",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, utils.ToUserResponse(user))
}

// DeleteUser deletes a user
func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error: "User not found",
				Message: fmt.Sprintf("User with ID %s does not exist", id),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Database error",
			Message: err.Error(),
		})
		return
	}
	
	if err := config.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to delete user",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully", "id": user.ID})
}