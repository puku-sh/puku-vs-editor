package main

// add rest api in echo framework


import ("net/http"
    "github.com/labstack/echo/v4"
)

func main() {
    e := echo.New()
    e.GET("/users", getUsers)
    e.POST("/users", createUser)
    e.PUT("/users/:id", updateUser)
    e.Logger.Fatal(e.Start(":8080"))
}


func getUsers(c echo.Context) error {
    return c.JSON(http.StatusOK, users)
}