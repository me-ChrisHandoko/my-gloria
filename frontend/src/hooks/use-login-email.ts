'use client';

/**
 * Hook untuk manage login email yang digunakan user
 * Email ini dikirim ke backend sebagai hint untuk matching yang efisien
 */

const LOGIN_EMAIL_KEY = 'clerk_login_email';

export function useLoginEmail() {
  /**
   * Simpan email yang digunakan untuk login
   * Dipanggil setelah user berhasil sign in
   */
  const saveLoginEmail = (email: string) => {
    if (typeof window !== 'undefined' && email) {
      localStorage.setItem(LOGIN_EMAIL_KEY, email);
      console.log('📧 [LoginEmail] Saved login email:', email);
    }
  };

  /**
   * Hapus login email (saat logout)
   */
  const clearLoginEmail = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOGIN_EMAIL_KEY);
      console.log('🗑️ [LoginEmail] Cleared login email');
    }
  };

  /**
   * Get current login email
   */
  const getLoginEmail = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOGIN_EMAIL_KEY);
    }
    return null;
  };

  return {
    saveLoginEmail,
    clearLoginEmail,
    getLoginEmail,
  };
}
