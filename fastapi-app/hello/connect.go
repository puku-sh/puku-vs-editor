// db connect using gorm
func connectDB(){
	dsn := "host=localhost user=postgres password=postgres dbname=postgres port=5432 sslmode=disable TimeZone=Asia/Shanghai"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	db.AutoMigrate(&User{})
	return db
}

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