package main


// add user struct gorm tags

type User struct {
    gorm.Model
    Name string
    Email string
}

// add db insert function

func InsertUser(db *gorm.DB, user *User) error {
    return db.Create(user).Error
}

// add db update function

func UpdateUser(db *gorm.DB, user *User) error {
    return db.Save(user).Error
}
// add db delete function

func DeleteUser(db *gorm.DB, user *User) error {
    return db.Delete(user).Error
}