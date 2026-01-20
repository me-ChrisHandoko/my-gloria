package email

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"
)

// EmailSender handles sending emails
type EmailSender struct {
	config *SMTPConfig
}

// NewEmailSender creates a new email sender
func NewEmailSender() *EmailSender {
	return &EmailSender{
		config: GetSMTPConfig(),
	}
}

// SendWelcomeEmail sends a welcome email after successful registration
func (s *EmailSender) SendWelcomeEmail(toEmail, name string) error {
	// In development, override recipient email
	recipient := toEmail
	if IsDevelopment() {
		recipient = GetDevelopmentEmail()
	}

	subject := "Selamat Datang di Gloria School"
	body := s.buildWelcomeEmailBody(toEmail, name)

	return s.sendEmail(recipient, subject, body)
}

// buildWelcomeEmailBody creates the HTML email body for welcome email
func (s *EmailSender) buildWelcomeEmailBody(originalEmail, name string) string {
	devNote := ""
	if IsDevelopment() {
		devNote = fmt.Sprintf(`
		<div style="background-color: #FEF3C7; border: 1px solid #F59E0B; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
			<strong>Development Mode:</strong> This email was intended for <strong>%s</strong> but sent to development inbox.
		</div>
		`, originalEmail)
	}

	loginURL := "http://localhost:3000/login"

	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Selamat Datang</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	%s
	<div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
		<h2 style="color: #2563EB;">Selamat Datang di Gloria School! 🎉</h2>
		<p>Halo <strong>%s</strong>,</p>
		<p>Akun Anda telah berhasil dibuat. Anda sekarang dapat mengakses sistem Gloria School menggunakan email dan password yang telah Anda daftarkan.</p>
		<div style="text-align: center; margin: 30px 0;">
			<a href="%s" style="background-color: #2563EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Masuk ke Sistem</a>
		</div>
		<p style="font-size: 14px; color: #666;">Jika Anda mengalami kesulitan, silakan hubungi administrator.</p>
		<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
		<p style="font-size: 12px; color: #999;">
			Gloria School<br>
			Email: support@gloriaschool.org
		</p>
	</div>
</body>
</html>
	`, devNote, name, loginURL)
}

// SendPasswordResetEmail sends a password reset email
func (s *EmailSender) SendPasswordResetEmail(toEmail, resetToken string) error {
	// In development, override recipient email
	recipient := toEmail
	if IsDevelopment() {
		recipient = GetDevelopmentEmail()
	}

	// Build reset URL - this will be the frontend URL
	resetURL := fmt.Sprintf("http://localhost:3000/reset-password?token=%s", resetToken)

	subject := "Password Reset Request"
	body := s.buildPasswordResetEmailBody(toEmail, resetURL)

	return s.sendEmail(recipient, subject, body)
}

// buildPasswordResetEmailBody creates the HTML email body for password reset
func (s *EmailSender) buildPasswordResetEmailBody(originalEmail, resetURL string) string {
	devNote := ""
	if IsDevelopment() {
		devNote = fmt.Sprintf(`
		<div style="background-color: #FEF3C7; border: 1px solid #F59E0B; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
			<strong>Development Mode:</strong> This email was requested for <strong>%s</strong> but sent to development inbox.
		</div>
		`, originalEmail)
	}

	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	%s
	<div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
		<h2 style="color: #2563EB;">Password Reset Request</h2>
		<p>You have requested to reset your password for your Gloria School account.</p>
		<p>Click the button below to reset your password:</p>
		<div style="text-align: center; margin: 30px 0;">
			<a href="%s" style="background-color: #2563EB; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
		</div>
		<p style="font-size: 14px; color: #666;">Or copy and paste this link in your browser:</p>
		<p style="font-size: 12px; word-break: break-all; background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 3px;">%s</p>
		<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
		<p style="font-size: 12px; color: #999;">
			This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
		</p>
		<p style="font-size: 12px; color: #999;">
			Gloria School<br>
			Email: support@gloriaschool.org
		</p>
	</div>
</body>
</html>
	`, devNote, resetURL, resetURL)
}

// sendEmail sends an email using SMTP
func (s *EmailSender) sendEmail(to, subject, htmlBody string) error {
	// Build email message
	headers := make(map[string]string)
	headers["From"] = s.config.From
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + htmlBody

	// Setup authentication
	auth := smtp.PlainAuth(
		"",
		s.config.Username,
		s.config.Password,
		s.config.Host,
	)

	// Connect to SMTP server
	addr := fmt.Sprintf("%s:%s", s.config.Host, s.config.Port)

	// Handle TLS encryption
	if s.config.Encryption == "tls" || s.config.Encryption == "starttls" {
		// Use STARTTLS
		return s.sendEmailWithStartTLS(addr, auth, s.config.From, []string{to}, []byte(message))
	}

	// Use plain SMTP (not recommended for production)
	return smtp.SendMail(addr, auth, s.config.From, []string{to}, []byte(message))
}

// sendEmailWithStartTLS sends email with STARTTLS encryption
func (s *EmailSender) sendEmailWithStartTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	// Parse host from addr
	host := strings.Split(addr, ":")[0]

	// Connect to server
	client, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer client.Close()

	// Start TLS
	tlsConfig := &tls.Config{
		ServerName:         host,
		InsecureSkipVerify: false,
	}

	if err = client.StartTLS(tlsConfig); err != nil {
		return fmt.Errorf("failed to start TLS: %w", err)
	}

	// Authenticate
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("failed to authenticate: %w", err)
	}

	// Set sender
	if err = client.Mail(from); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	// Set recipients
	for _, recipient := range to {
		if err = client.Rcpt(recipient); err != nil {
			return fmt.Errorf("failed to set recipient: %w", err)
		}
	}

	// Send message
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}
	defer writer.Close()

	_, err = writer.Write(msg)
	if err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}

	return nil
}
