package repository

import (
	"errors"
	"strings"

	"backend/internal/domain"

	"gorm.io/gorm"
)

var (
	ErrEmployeeNotFound = errors.New("employee not found")
)

// EmployeeRepository defines the interface for employee data operations
type EmployeeRepository interface {
	FindByNIP(nip string) (*domain.DataKaryawan, error)
	FindByEmail(email string) (*domain.DataKaryawan, error)
	FindByEmails(emails []string) (*domain.DataKaryawan, string, error)
	FindAll(page, limit int, search string) ([]domain.DataKaryawan, int64, error)
	FindActive(page, limit int, search string) ([]domain.DataKaryawan, int64, error)
	FindByDepartment(bagianKerja string, page, limit int) ([]domain.DataKaryawan, int64, error)
	FindByLocation(lokasi string, page, limit int) ([]domain.DataKaryawan, int64, error)
	Search(query string, limit int) ([]domain.DataKaryawan, error)
	GetStatistics() (*EmployeeStatistics, error)
}

// EmployeeStatistics contains employee statistics
type EmployeeStatistics struct {
	TotalEmployees   int64            `json:"total_employees"`
	ActiveEmployees  int64            `json:"active_employees"`
	ByDepartment     map[string]int64 `json:"by_department"`
	ByLocation       map[string]int64 `json:"by_location"`
	ByEmployeeType   map[string]int64 `json:"by_employee_type"`
}

// employeeRepository implements EmployeeRepository
type employeeRepository struct {
	db *gorm.DB
}

// NewEmployeeRepository creates a new employee repository instance
func NewEmployeeRepository(db *gorm.DB) EmployeeRepository {
	return &employeeRepository{db: db}
}

// FindByNIP finds an employee by NIP
func (r *employeeRepository) FindByNIP(nip string) (*domain.DataKaryawan, error) {
	var employee domain.DataKaryawan
	if err := r.db.First(&employee, "nip = ?", nip).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}
	return &employee, nil
}

// FindByEmail finds an active employee by email (case-insensitive)
func (r *employeeRepository) FindByEmail(email string) (*domain.DataKaryawan, error) {
	var employee domain.DataKaryawan
	if err := r.db.Where("LOWER(email) = LOWER(?) AND status_aktif = ?", email, "Aktif").First(&employee).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrEmployeeNotFound
		}
		return nil, err
	}
	return &employee, nil
}

// FindByEmails finds an active employee by any of the provided emails (case-insensitive)
// Returns employee, matched email, and error
// This is more efficient than looping FindByEmail as it uses a single WHERE IN query
func (r *employeeRepository) FindByEmails(emails []string) (*domain.DataKaryawan, string, error) {
	if len(emails) == 0 {
		return nil, "", ErrEmployeeNotFound
	}

	// Convert all emails to lowercase for case-insensitive comparison
	lowerEmails := make([]string, len(emails))
	for i, email := range emails {
		lowerEmails[i] = strings.ToLower(email)
	}

	// Single query with WHERE IN - efficient even with 100 emails
	var employee domain.DataKaryawan
	if err := r.db.Where("LOWER(email) IN ? AND status_aktif = ?", lowerEmails, "Aktif").First(&employee).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, "", ErrEmployeeNotFound
		}
		return nil, "", err
	}

	// Return the employee and the matched email (from database)
	matchedEmail := ""
	if employee.Email != nil {
		matchedEmail = *employee.Email
	}

	return &employee, matchedEmail, nil
}

// FindAll finds all employees with pagination and search
func (r *employeeRepository) FindAll(page, limit int, search string) ([]domain.DataKaryawan, int64, error) {
	var employees []domain.DataKaryawan
	var total int64

	query := r.db.Model(&domain.DataKaryawan{})

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("nama ILIKE ? OR nip ILIKE ? OR email ILIKE ?", searchPattern, searchPattern, searchPattern)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Order("nama ASC").Offset(offset).Limit(limit).Find(&employees).Error; err != nil {
		return nil, 0, err
	}

	return employees, total, nil
}

// FindActive finds all active employees with pagination
func (r *employeeRepository) FindActive(page, limit int, search string) ([]domain.DataKaryawan, int64, error) {
	var employees []domain.DataKaryawan
	var total int64

	query := r.db.Model(&domain.DataKaryawan{}).Where("status_aktif = ?", "Aktif")

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("nama ILIKE ? OR nip ILIKE ? OR email ILIKE ?", searchPattern, searchPattern, searchPattern)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Order("nama ASC").Offset(offset).Limit(limit).Find(&employees).Error; err != nil {
		return nil, 0, err
	}

	return employees, total, nil
}

// FindByDepartment finds employees by department
func (r *employeeRepository) FindByDepartment(bagianKerja string, page, limit int) ([]domain.DataKaryawan, int64, error) {
	var employees []domain.DataKaryawan
	var total int64

	query := r.db.Model(&domain.DataKaryawan{}).Where("bagian_kerja = ?", bagianKerja)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Order("nama ASC").Offset(offset).Limit(limit).Find(&employees).Error; err != nil {
		return nil, 0, err
	}

	return employees, total, nil
}

// FindByLocation finds employees by location
func (r *employeeRepository) FindByLocation(lokasi string, page, limit int) ([]domain.DataKaryawan, int64, error) {
	var employees []domain.DataKaryawan
	var total int64

	query := r.db.Model(&domain.DataKaryawan{}).Where("lokasi = ?", lokasi)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Order("nama ASC").Offset(offset).Limit(limit).Find(&employees).Error; err != nil {
		return nil, 0, err
	}

	return employees, total, nil
}

// Search searches for employees
func (r *employeeRepository) Search(query string, limit int) ([]domain.DataKaryawan, error) {
	var employees []domain.DataKaryawan
	searchPattern := "%" + query + "%"

	if err := r.db.Where("nama ILIKE ? OR nip ILIKE ? OR email ILIKE ?", searchPattern, searchPattern, searchPattern).
		Order("nama ASC").
		Limit(limit).
		Find(&employees).Error; err != nil {
		return nil, err
	}

	return employees, nil
}

// GetStatistics gets employee statistics
func (r *employeeRepository) GetStatistics() (*EmployeeStatistics, error) {
	stats := &EmployeeStatistics{
		ByDepartment:   make(map[string]int64),
		ByLocation:     make(map[string]int64),
		ByEmployeeType: make(map[string]int64),
	}

	// Total employees
	if err := r.db.Model(&domain.DataKaryawan{}).Count(&stats.TotalEmployees).Error; err != nil {
		return nil, err
	}

	// Active employees
	if err := r.db.Model(&domain.DataKaryawan{}).Where("status_aktif = ?", "Aktif").Count(&stats.ActiveEmployees).Error; err != nil {
		return nil, err
	}

	// By department
	var deptStats []struct {
		BagianKerja string
		Count       int64
	}
	if err := r.db.Model(&domain.DataKaryawan{}).
		Select("bagian_kerja, count(*) as count").
		Where("bagian_kerja IS NOT NULL").
		Group("bagian_kerja").
		Scan(&deptStats).Error; err != nil {
		return nil, err
	}
	for _, d := range deptStats {
		stats.ByDepartment[d.BagianKerja] = d.Count
	}

	// By location
	var locStats []struct {
		Lokasi string
		Count  int64
	}
	if err := r.db.Model(&domain.DataKaryawan{}).
		Select("lokasi, count(*) as count").
		Where("lokasi IS NOT NULL").
		Group("lokasi").
		Scan(&locStats).Error; err != nil {
		return nil, err
	}
	for _, l := range locStats {
		stats.ByLocation[l.Lokasi] = l.Count
	}

	// By employee type
	var typeStats []struct {
		JenisKaryawan string
		Count         int64
	}
	if err := r.db.Model(&domain.DataKaryawan{}).
		Select("jenis_karyawan, count(*) as count").
		Where("jenis_karyawan IS NOT NULL").
		Group("jenis_karyawan").
		Scan(&typeStats).Error; err != nil {
		return nil, err
	}
	for _, t := range typeStats {
		stats.ByEmployeeType[t.JenisKaryawan] = t.Count
	}

	return stats, nil
}
