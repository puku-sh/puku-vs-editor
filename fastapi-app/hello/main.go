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
	e.Logger.Fatal(e.Start(":1323"))
	
}
