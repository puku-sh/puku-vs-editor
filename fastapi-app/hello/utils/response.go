package utils

import (
	"net/http"
	"hello/models"
)

// SendError sends a standardized error response
func SendError(c *http.Request, statusCode int, errorText, message string) {
	// Note: This needs to be adapted for Gin context
	// For now, this is a placeholder
}

// ToUserResponse converts User model to UserResponse (hides password)
func ToUserResponse(user models.User) models.UserResponse {
	return models.UserResponse{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
		Phone:    user.Phone,
	}
}