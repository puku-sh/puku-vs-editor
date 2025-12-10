package main



// add rest api in echo framework to create a user
func main() {
	e := echo.New()
	e.POST("/users", func(c echo.Context) error {
		db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
		if err != nil {
			return c.JSON(http.StatusInternalServerError, err)
		}
		user := new(User)
		if err := c.Bind(user); err != nil {
			return c.JSON(http.StatusBadRequest, err)
		}
		createUser(db, user.Name, user.Email)
		return c.JSON(http.StatusCreated, user)
	})
	e.Logger.Fatal(e.Start(":8080"))