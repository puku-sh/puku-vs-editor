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
func getUsers(c echo.Context) error {
	users := []User{
		{ID: 1, Name: "John Doe"},
		{ID: 2, Name: "Jane Doe"},
	}
	return c.JSON(http.StatusOK, users)
}

type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Email string `json:"email"`
}