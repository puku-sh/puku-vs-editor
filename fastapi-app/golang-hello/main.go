package main



// add rest api in echo framework to create a user

// add rest api in echo framework to get a user
func getUser(c echo.Context) error {
    id := c.Param("id")
    user := new(User)
    if err := c.Bind(user); err != nil {
        return err
    }
    return c.JSON(http.StatusOK, user)
}
// add rest api in echo framework to update a user
func updateUser(c echo.Context) error {
    id := c.Param("id")
    user := new(User)
    if err := c.Bind(user); err != nil {
        return err
    }
    return c.JSON(http.StatusOK, user)
}

// add rest api in echo framework to delete a user
func deleteUser(c echo.Context) error {
    id := c.Param("id")
    user := new(User)
    if err := c.Bind(user); err != nil {
        return err
    }
    return c.JSON(http.StatusOK, user)
}
