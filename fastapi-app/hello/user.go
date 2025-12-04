package main

// add user gorm model

import (
	"gorm.io/gorm"
)

type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}




// ge all users
func getUsers(db *gorm.DB) []User {
	var users []User
	db.Find(&users)
	return users
}
// update user
func updateUser(db *gorm.DB, id int, name string) {
	user := User{ID: id, Name: name}
	db.Save(&user)
}

