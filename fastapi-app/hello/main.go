package main

// add rest api in echo framework to get all users from database
import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func main() {
	e := echo.New()
	e.GET("/users", getUsers)
	e.Logger.Fatal(e.Start(":8080"))
}

