//go:build ignore

package main

import (
	"fmt"
	"os"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	godotenv.Load()
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"), os.Getenv("DB_SSLMODE"))
	db, _ := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})

	type M struct {
		Name      string  `gorm:"column:name"`
		Icon      *string `gorm:"column:icon"`
		SortOrder int     `gorm:"column:sort_order"`
	}
	var modules []M
	db.Table("public.modules").Where("is_active = true AND is_visible = true").Order("sort_order").Find(&modules)
	for _, m := range modules {
		icon := "NULL"
		if m.Icon != nil { icon = *m.Icon }
		fmt.Printf("[%d] %s - icon: %s\n", m.SortOrder, m.Name, icon)
	}
}
