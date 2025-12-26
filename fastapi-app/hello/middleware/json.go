package middleware

import (
	"github.com/gin-gonic/gin"
)

// JSON sets JSON content type headers
func JSON() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Content-Type", "application/json")
		c.Next()
	}
}