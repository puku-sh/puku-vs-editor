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

	// get users endpoint from db
	e.GET("/users", func(c echo.Context) error {
		return c.String(http.StatusOK, "Hello, World!")
	})
	// create user endpoint with gorm insert
	e.POST("/users", func(c echo.Context) error {
		// get user from request body
		user := new(User)
		if err := c.Bind(user); err != nil {
			return err
		}
		// insert user to db
		addUser(db, user.Name, user.Email)
		
		// return user
		return c.String(http.StatusOK, "Hello, World!")
	})

	// start server
	e.Logger.Fatal(e.Start(":1323"))
}
