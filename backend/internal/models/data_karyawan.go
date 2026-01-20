package models

import (
	"time"
)

// DataKaryawan represents employee master data from public schema
// This is the source of truth for employee information
type DataKaryawan struct {
	NIP                    string     `json:"nip" gorm:"column:nip;type:varchar(15);primaryKey"`
	Nama                   *string    `json:"nama,omitempty" gorm:"type:varchar(109)"`
	JenisKelamin           *string    `json:"jenis_kelamin,omitempty" gorm:"column:jenis_kelamin;type:varchar(1)"`
	TglMulaiBekerja        *time.Time `json:"tgl_mulai_bekerja,omitempty" gorm:"column:tgl_mulai_bekerja"`
	TglTetap               *time.Time `json:"tgl_tetap,omitempty" gorm:"column:tgl_tetap"`
	Status                 *string    `json:"status,omitempty" gorm:"type:varchar(10)"`
	WaktuKerjaKependidikan *string    `json:"waktu_kerja_kependidikan,omitempty" gorm:"column:waktu_kerja_kependidikan;type:varchar(10)"`
	BagianKerja            *string    `json:"bagian_kerja,omitempty" gorm:"column:bagian_kerja;type:varchar(50);index"`
	Lokasi                 *string    `json:"lokasi,omitempty" gorm:"type:varchar(20)"`
	BidangKerja            *string    `json:"bidang_kerja,omitempty" gorm:"column:bidang_kerja;type:varchar(70);index"`
	JenisKaryawan          *string    `json:"jenis_karyawan,omitempty" gorm:"column:jenis_karyawan;type:varchar(20)"`
	StatusAktif            *string    `json:"status_aktif,omitempty" gorm:"column:status_aktif;type:varchar(8)"`
	NoPonsel               *string    `json:"no_ponsel,omitempty" gorm:"column:no_ponsel;type:varchar(25)"`
	Email                  *string    `json:"email,omitempty" gorm:"type:varchar(100);index"`
	Birthdate              *time.Time `json:"birthdate,omitempty"`
	RFID                   *string    `json:"rfid,omitempty" gorm:"column:rfid;type:varchar(100)"`
}

// TableName specifies the table name for DataKaryawan in public schema
func (DataKaryawan) TableName() string {
	return "public.data_karyawan"
}

// DataKaryawanResponse represents the response body for employee data
type DataKaryawanResponse struct {
	NIP                    string     `json:"nip"`
	Nama                   *string    `json:"nama,omitempty"`
	JenisKelamin           *string    `json:"jenis_kelamin,omitempty"`
	TglMulaiBekerja        *time.Time `json:"tgl_mulai_bekerja,omitempty"`
	TglTetap               *time.Time `json:"tgl_tetap,omitempty"`
	Status                 *string    `json:"status,omitempty"`
	WaktuKerjaKependidikan *string    `json:"waktu_kerja_kependidikan,omitempty"`
	BagianKerja            *string    `json:"bagian_kerja,omitempty"`
	Lokasi                 *string    `json:"lokasi,omitempty"`
	BidangKerja            *string    `json:"bidang_kerja,omitempty"`
	JenisKaryawan          *string    `json:"jenis_karyawan,omitempty"`
	StatusAktif            *string    `json:"status_aktif,omitempty"`
	NoPonsel               *string    `json:"no_ponsel,omitempty"`
	Email                  *string    `json:"email,omitempty"`
	Birthdate              *time.Time `json:"birthdate,omitempty"`
	RFID                   *string    `json:"rfid,omitempty"`
}

// DataKaryawanListResponse represents the response for listing employees
type DataKaryawanListResponse struct {
	NIP           string  `json:"nip"`
	Nama          *string `json:"nama,omitempty"`
	Email         *string `json:"email,omitempty"`
	BagianKerja   *string `json:"bagian_kerja,omitempty"`
	JenisKaryawan *string `json:"jenis_karyawan,omitempty"`
	StatusAktif   *string `json:"status_aktif,omitempty"`
}

// ToResponse converts DataKaryawan to DataKaryawanResponse
func (d *DataKaryawan) ToResponse() *DataKaryawanResponse {
	return &DataKaryawanResponse{
		NIP:                    d.NIP,
		Nama:                   d.Nama,
		JenisKelamin:           d.JenisKelamin,
		TglMulaiBekerja:        d.TglMulaiBekerja,
		TglTetap:               d.TglTetap,
		Status:                 d.Status,
		WaktuKerjaKependidikan: d.WaktuKerjaKependidikan,
		BagianKerja:            d.BagianKerja,
		Lokasi:                 d.Lokasi,
		BidangKerja:            d.BidangKerja,
		JenisKaryawan:          d.JenisKaryawan,
		StatusAktif:            d.StatusAktif,
		NoPonsel:               d.NoPonsel,
		Email:                  d.Email,
		Birthdate:              d.Birthdate,
		RFID:                   d.RFID,
	}
}

// ToListResponse converts DataKaryawan to DataKaryawanListResponse
func (d *DataKaryawan) ToListResponse() *DataKaryawanListResponse {
	return &DataKaryawanListResponse{
		NIP:           d.NIP,
		Nama:          d.Nama,
		Email:         d.Email,
		BagianKerja:   d.BagianKerja,
		JenisKaryawan: d.JenisKaryawan,
		StatusAktif:   d.StatusAktif,
	}
}

// GetFullName returns the employee's full name or NIP if name is not set
func (d *DataKaryawan) GetFullName() string {
	if d.Nama != nil && *d.Nama != "" {
		return *d.Nama
	}
	return d.NIP
}

// IsActiveEmployee checks if the employee is currently active
func (d *DataKaryawan) IsActiveEmployee() bool {
	if d.StatusAktif == nil {
		return false
	}
	// Accept AKTIF, aktif, or Aktif (case variations)
	status := *d.StatusAktif
	return status == "AKTIF" || status == "aktif" || status == "Aktif"
}

// SplitName splits the full name into firstname and lastname
// Takes first word as firstname and last word as lastname (excludes middle names)
// If single part, uses it as firstname with empty lastname
func (d *DataKaryawan) SplitName() (firstname string, lastname string) {
	if d.Nama == nil || *d.Nama == "" {
		return d.NIP, ""
	}

	fullName := *d.Nama
	// Split by space
	parts := make([]string, 0)
	current := ""
	for _, char := range fullName {
		if char == ' ' {
			if current != "" {
				parts = append(parts, current)
				current = ""
			}
		} else {
			current += string(char)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}

	if len(parts) == 0 {
		return d.NIP, ""
	} else if len(parts) == 1 {
		return parts[0], ""
	} else {
		// First word as firstname, last word as lastname (excludes middle names)
		firstname = parts[0]
		lastname = parts[len(parts)-1]
		return firstname, lastname
	}
}
