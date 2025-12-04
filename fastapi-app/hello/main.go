// write simple api in echo
package main

import (
	"net/http"

	"github.com/labstack/echo/v4" // import echo framework
)

func main() {
	e := echo.New()
	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Hello, World!")
	})

	

	e.POST("/users", func(c echo.Context) error {
		user := new(User)
		if err := c.Bind(user); err != nil {
			return err
		}
		return c.JSON(http.StatusCreated, user)
	})

	e.GET("/users/:id", func(c echo.Context) error {
		id := c.Param("id")
		// Fetch user from database
		db := connectDB()
		var user User
		db.First(&user, id)

		if user.ID == 0 {
			return c.String(http.StatusNotFound, "User not found")
		}

		// Return user
		return c.JSON(http.StatusOK, user)
	})

	e.GET("/users/:id", func(c echo.Context) error {
		id := c.Param("id")
		// Fetch user from database
		db := connectDB()
		var user User
		db.First(&user, id)

		if user.ID == 0 {
			return c.String(http.StatusNotFound, "User not found")
		}

		return c.String(http.StatusOK, id)
	})

	e.Logger.Fatal(e.Start(":1323"))
	
}
