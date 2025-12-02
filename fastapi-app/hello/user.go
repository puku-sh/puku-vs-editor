package main

// add user gorm model
type User struct {
	gorm.Model
	Name string
	Email string
}

func connectDB(){
	dsn := "host=localhost user=postgres password=postgres dbname=postgres port=5432 sslmode=disable TimeZone=Asia/Shanghai"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	db.AutoMigrate(&User{})
	return db
}

//add user using gorm
func addUser(db *gorm.DB, name string, email string) {
	user := User{Name: name, Email: email}
	db.Create(&user)
}
//get all users using gorm
func getUsers(db *gorm.DB) []User {
	var users []User
	db.Find(&users)
	return users
}
//update user by id using gorm
func updateUser(db *gorm.DB, id uint, name string, email string) {
	var user User
	db.First(&user, id)
	user.Name = name
	user.Email = email
	db.Save(&user)
}

//delete user by id using gorm
func deleteUser(db *gorm.DB, id uint) {
	var user User
	db.First(&user, id)
	db.Delete(&user)
}

