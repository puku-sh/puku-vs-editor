// add user model with gorm 
type User struct {
	ID    uint   `gorm:"primaryKey"`
	Name  string `gorm:"not null"`
	Email string `gorm:"unique;not null"`
}

// add user repository with gorm
type UserRepository struct {
	db *gorm.DB
}

func (r *UserRepository) Create(user *User) error {
	return r.db.Create(user).Error
}

func (r *UserRepository) Get(id uint) (User, error) {
	var user User
	return user, r.db.First(&user, id).Error
}


func (r *UserRepository) GetAll() ([]User, error) {
	var users []User
	return users, r.db.Find(&users).Error
}

// delete user based on gorm db
func deleteUser(db *gorm.DB, id int) {
	var user User
	db.Where("id = ?", id).Delete(&user)
}

// update user based on gorm db 
func updateUser(db *gorm.DB, id int, name string, email string) {
	var user User
	db.Where("id = ?", id).First(&user)
	user.Name = name
	user.Email = email
	db.Save(&user)
}
// get user based on gorm db
func getUser(db *gorm.DB, id int) User {
	var user User
	db.Where("id = ?", id).First(&user)
	return user
}