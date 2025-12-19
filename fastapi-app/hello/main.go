package main 

// add rest api in echo framework
func main() {
	e := echo.New()
	e.GET("/users", getUsers)
	e.POST("/users", createUser)
	e.Logger.Fatal(e.Start(":8080"))
}

