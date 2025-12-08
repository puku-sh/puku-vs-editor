// db connect using gorm
func dbConnect() *gorm.DB {
	db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	return db
}

// create user based on gorm db
func createUser(db *gorm.DB, name string, email string) {
	user := User{Name: name, Email: email}
	db.Create(&user)
}


// get user id

// get user based on gorm db
func getUsers(db *gorm.DB) []User{
	var users []User
	db.Find(&users)
	return users
}

func updateUser(db *gorm.DB, id int, name string) {
	var user User
	db.Model(&user).Where("id = ?", id).Update("name", name)
}

// delete user based on gorm db
func deleteUser(db *gorm.DB, id int) {
	var user User
	db.Where("id = ?", id).Delete(&user)
}