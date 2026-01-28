// Package i18n - Indonesian translations
package i18n

// TranslationsID contains all Indonesian translations
var TranslationsID = map[string]string{
	// ============================================================
	// Authentication Messages
	// ============================================================
	"auth.email.not_registered":    "Email tidak terdaftar sebagai karyawan",
	"auth.account.inactive":        "Akun karyawan tidak aktif",
	"auth.email.already_exists":    "Email sudah terdaftar",
	"auth.credentials.invalid":     "Email atau password salah",
	"auth.login.success":           "Login berhasil",
	"auth.logout.success":          "Logout berhasil",
	"auth.register.success":        "Registrasi berhasil",
	"auth.password.changed":        "Password berhasil diubah",
	"auth.password.hash_failed":    "Gagal mengenkripsi password",
	"auth.token.invalid":           "Token tidak valid",
	"auth.token.expired":           "Token sudah kadaluarsa",
	"auth.token.generate_failed":   "Gagal membuat token",
	"auth.refresh.success":         "Token berhasil diperbarui",
	"auth.refresh.failed":          "Gagal memperbarui token",
	"auth.old_password.incorrect":  "Password lama salah",
	"auth.password_reset.sent":     "Link reset password telah dikirim ke email",
	"auth.password_reset.success":  "Password berhasil direset",
	"auth.password_reset.invalid":  "Link reset password tidak valid",
	"auth.password_reset.expired":  "Link reset password sudah kadaluarsa",

	// ============================================================
	// Validation Messages
	// ============================================================
	"validation.required":      "%s wajib diisi",
	"validation.min_length":    "%s minimal %d karakter",
	"validation.max_length":    "%s maksimal %d karakter",
	"validation.invalid_email": "Format email tidak valid",
	"validation.invalid_json":  "Format JSON tidak valid",
	"validation.invalid_uuid":  "Format ID tidak valid",

	// ============================================================
	// CRUD Operation Messages
	// ============================================================
	"crud.created":        "%s berhasil ditambahkan",
	"crud.updated":        "%s berhasil diperbarui",
	"crud.deleted":        "%s berhasil dihapus",
	"crud.not_found":      "%s tidak ditemukan",
	"crud.already_exists": "%s sudah ada",
	"crud.create_failed":  "Gagal menambahkan %s",
	"crud.update_failed":  "Gagal memperbarui %s",
	"crud.delete_failed":  "Gagal menghapus %s",
	"crud.fetch_failed":   "Gagal mengambil data %s",

	// ============================================================
	// User Messages
	// ============================================================
	"user.not_found":      "User tidak ditemukan",
	"user.created":        "User berhasil ditambahkan",
	"user.updated":        "User berhasil diperbarui",
	"user.deleted":        "User berhasil dihapus",
	"user.already_exists": "User sudah ada",

	// ============================================================
	// Role Messages
	// ============================================================
	"role.not_found":             "Role tidak ditemukan",
	"role.created":               "Role berhasil ditambahkan",
	"role.updated":               "Role berhasil diperbarui",
	"role.deleted":               "Role berhasil dihapus",
	"role.assigned":              "Role berhasil diberikan",
	"role.revoked":               "Role berhasil dicabut",
	"role.system_cannot_modify":  "Role sistem tidak dapat diubah",

	// ============================================================
	// Permission Messages
	// ============================================================
	"permission.not_found":  "Permission tidak ditemukan",
	"permission.created":    "Permission berhasil ditambahkan",
	"permission.updated":    "Permission berhasil diperbarui",
	"permission.deleted":    "Permission berhasil dihapus",
	"permission.assigned":   "Permission berhasil diberikan",
	"permission.revoked":    "Permission berhasil dicabut",
	"permission.denied":     "Anda tidak memiliki izin untuk melakukan aksi ini",
	"permission.escalation": "Tidak dapat memberikan permission yang tidak Anda miliki",

	// ============================================================
	// Module Messages
	// ============================================================
	"module.not_found": "Module tidak ditemukan",
	"module.created":   "Module berhasil ditambahkan",
	"module.updated":   "Module berhasil diperbarui",
	"module.deleted":   "Module berhasil dihapus",
	"module.assigned":  "Akses module berhasil diberikan",
	"module.revoked":   "Akses module berhasil dicabut",

	// ============================================================
	// Organization Messages (School, Department, Position)
	// ============================================================
	"school.not_found":     "Sekolah tidak ditemukan",
	"school.created":       "Sekolah berhasil ditambahkan",
	"school.updated":       "Sekolah berhasil diperbarui",
	"school.deleted":       "Sekolah berhasil dihapus",
	"department.not_found": "Departemen tidak ditemukan",
	"department.created":   "Departemen berhasil ditambahkan",
	"department.updated":   "Departemen berhasil diperbarui",
	"department.deleted":   "Departemen berhasil dihapus",
	"position.not_found":   "Posisi tidak ditemukan",
	"position.created":     "Posisi berhasil ditambahkan",
	"position.updated":     "Posisi berhasil diperbarui",
	"position.deleted":     "Posisi berhasil dihapus",
	"position.assigned":    "Posisi berhasil diberikan",
	"position.revoked":     "Posisi berhasil dicabut",

	// ============================================================
	// Generic Error Messages
	// ============================================================
	"error.internal":     "Terjadi kesalahan internal server",
	"error.unauthorized": "Anda belum login atau sesi telah berakhir",
	"error.forbidden":    "Anda tidak memiliki akses",
	"error.not_found":    "Data tidak ditemukan",
	"error.bad_request":  "Request tidak valid",
	"error.conflict":     "Data sudah ada atau konflik",
}
