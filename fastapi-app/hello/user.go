// add user model with gorm tags

type User struct {
    gorm.Model
    Name string `gorm:"type:varchar(100);not null"`
    Email string `gorm:"type:varchar(100);uniqueIndex;not null"`
}