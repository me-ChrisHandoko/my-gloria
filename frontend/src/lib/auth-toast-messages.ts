/**
 * Auth Toast Messages
 *
 * User-friendly toast notification messages for authentication errors and events.
 * Provides consistent messaging across the application.
 */

import { AuthErrorType } from '@/types/auth';

/**
 * Toast message configuration
 */
export interface ToastMessage {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

/**
 * Authentication event messages
 */
export const authEventMessages = {
  // Sign in events
  signInSuccess: {
    title: 'Welcome back!',
    description: 'You have been signed in successfully.',
    variant: 'success' as const,
    duration: 3000,
  },

  signInFailed: {
    title: 'Sign in failed',
    description: 'Please check your credentials and try again.',
    variant: 'destructive' as const,
    duration: 5000,
  },

  // Sign out events
  signOutSuccess: {
    title: 'Signed out',
    description: 'You have been signed out successfully.',
    variant: 'default' as const,
    duration: 3000,
  },

  signOutFailed: {
    title: 'Sign out failed',
    description: 'An error occurred while signing out. Please try again.',
    variant: 'destructive' as const,
    duration: 5000,
  },

  // Session events
  sessionExpired: {
    title: 'Session expired',
    description: 'Your session has expired. Please sign in again.',
    variant: 'destructive' as const,
    duration: 5000,
  },

  sessionRefreshed: {
    title: 'Session refreshed',
    description: 'Your session has been refreshed successfully.',
    variant: 'success' as const,
    duration: 2000,
  },

  // Account status events
  accountDeactivated: {
    title: 'Akun Tidak Aktif',
    description:
      'Akun Anda telah dinonaktifkan oleh HR. Anda akan dialihkan ke halaman login.',
    variant: 'destructive' as const,
    duration: 5000,
  },

  accountReactivated: {
    title: 'Akun Aktif Kembali',
    description: 'Akun Anda telah diaktifkan kembali oleh HR.',
    variant: 'success' as const,
    duration: 4000,
  },

  // Permission events
  permissionGranted: {
    title: 'Access granted',
    description: 'You now have permission to access this resource.',
    variant: 'success' as const,
    duration: 3000,
  },

  permissionRevoked: {
    title: 'Access revoked',
    description: 'Your access to this resource has been revoked.',
    variant: 'destructive' as const,
    duration: 5000,
  },
};

/**
 * Get toast message for auth error
 *
 * @param errorType - Type of authentication error
 * @param customMessage - Optional custom message to override default
 * @returns Toast message configuration
 */
export function getAuthErrorMessage(
  errorType: AuthErrorType,
  customMessage?: string
): ToastMessage {
  const messages: Record<AuthErrorType, ToastMessage> = {
    [AuthErrorType.PERMISSION_DENIED]: {
      title: 'Access Denied',
      description:
        customMessage ||
        'You do not have permission to perform this action. Please contact your administrator if you believe this is an error.',
      variant: 'destructive',
      duration: 5000,
    },

    [AuthErrorType.ROLE_REQUIRED]: {
      title: 'Role Required',
      description:
        customMessage ||
        'This feature requires a specific role that you do not have. Please contact your administrator for access.',
      variant: 'destructive',
      duration: 5000,
    },

    [AuthErrorType.MODULE_ACCESS_DENIED]: {
      title: 'Module Access Denied',
      description:
        customMessage ||
        'You do not have access to this module. Please contact your administrator to request access.',
      variant: 'destructive',
      duration: 5000,
    },

    [AuthErrorType.AUTHENTICATION_REQUIRED]: {
      title: 'Authentication Required',
      description:
        customMessage ||
        'You must be signed in to access this resource. Redirecting to sign-in page...',
      variant: 'destructive',
      duration: 4000,
    },

    [AuthErrorType.TOKEN_EXPIRED]: {
      title: 'Session Expired',
      description:
        customMessage ||
        'Your session has expired. Please sign in again to continue.',
      variant: 'destructive',
      duration: 5000,
    },

    [AuthErrorType.INVALID_TOKEN]: {
      title: 'Invalid Session',
      description:
        customMessage ||
        'Your session is invalid. Please sign in again.',
      variant: 'destructive',
      duration: 5000,
    },
  };

  return messages[errorType];
}

/**
 * Permission check result messages
 */
export function getPermissionCheckMessage(
  granted: boolean,
  permission: string
): ToastMessage {
  if (granted) {
    return {
      title: 'Permission Granted',
      description: `You have permission: ${permission}`,
      variant: 'success',
      duration: 3000,
    };
  }

  return {
    title: 'Permission Denied',
    description: `You lack permission: ${permission}`,
    variant: 'destructive',
    duration: 4000,
  };
}

/**
 * Role check result messages
 */
export function getRoleCheckMessage(
  hasRole: boolean,
  role: string
): ToastMessage {
  if (hasRole) {
    return {
      title: 'Role Verified',
      description: `You have the required role: ${role}`,
      variant: 'success',
      duration: 3000,
    };
  }

  return {
    title: 'Role Required',
    description: `This feature requires the ${role} role.`,
    variant: 'destructive',
    duration: 4000,
  };
}

/**
 * Module access messages
 */
export function getModuleAccessMessage(
  hasAccess: boolean,
  moduleName: string
): ToastMessage {
  if (hasAccess) {
    return {
      title: 'Access Granted',
      description: `You have access to the ${moduleName} module.`,
      variant: 'success',
      duration: 3000,
    };
  }

  return {
    title: 'Module Access Denied',
    description: `You do not have access to the ${moduleName} module.`,
    variant: 'destructive',
    duration: 4000,
  };
}

/**
 * Network error messages
 */
export const networkErrorMessages = {
  offline: {
    title: 'No Internet Connection',
    description:
      'Please check your internet connection and try again.',
    variant: 'destructive' as const,
    duration: 5000,
  },

  timeout: {
    title: 'Request Timeout',
    description:
      'The request took too long to complete. Please try again.',
    variant: 'destructive' as const,
    duration: 5000,
  },

  serverError: {
    title: 'Server Error',
    description:
      'An error occurred on the server. Please try again later.',
    variant: 'destructive' as const,
    duration: 5000,
  },

  badRequest: {
    title: 'Invalid Request',
    description:
      'The request was invalid. Please check your input and try again.',
    variant: 'destructive' as const,
    duration: 5000,
  },
};

/**
 * Success messages for common auth operations
 */
export const authSuccessMessages = {
  profileUpdated: {
    title: 'Profile Updated',
    description: 'Your profile has been updated successfully.',
    variant: 'success' as const,
    duration: 3000,
  },

  passwordChanged: {
    title: 'Password Changed',
    description: 'Your password has been changed successfully.',
    variant: 'success' as const,
    duration: 3000,
  },

  settingsSaved: {
    title: 'Settings Saved',
    description: 'Your settings have been saved successfully.',
    variant: 'success' as const,
    duration: 3000,
  },

  emailVerified: {
    title: 'Email Verified',
    description: 'Your email address has been verified.',
    variant: 'success' as const,
    duration: 3000,
  },

  twoFactorEnabled: {
    title: 'Two-Factor Authentication Enabled',
    description: 'Your account is now more secure with 2FA.',
    variant: 'success' as const,
    duration: 4000,
  },

  twoFactorDisabled: {
    title: 'Two-Factor Authentication Disabled',
    description: 'Two-factor authentication has been disabled.',
    variant: 'default' as const,
    duration: 3000,
  },
};

/**
 * Generic error message for unknown errors
 */
export const genericErrorMessage: ToastMessage = {
  title: 'Something went wrong',
  description:
    'An unexpected error occurred. Please try again or contact support if the problem persists.',
  variant: 'destructive',
  duration: 5000,
};

/**
 * Get user-friendly error message from any error
 *
 * @param error - Error object
 * @returns Toast message configuration
 */
export function getErrorMessage(error: any): ToastMessage {
  // Check if it's an auth error with type
  if (error?.type && Object.values(AuthErrorType).includes(error.type)) {
    return getAuthErrorMessage(error.type, error.message);
  }

  // Check for network errors
  if (error?.status === 0 || error?.message?.includes('NetworkError')) {
    return networkErrorMessages.offline;
  }

  if (error?.status === 408 || error?.message?.includes('timeout')) {
    return networkErrorMessages.timeout;
  }

  if (error?.status >= 500) {
    return networkErrorMessages.serverError;
  }

  if (error?.status === 400) {
    return networkErrorMessages.badRequest;
  }

  // Use custom message if provided
  if (error?.message) {
    return {
      title: 'Error',
      description: error.message,
      variant: 'destructive',
      duration: 5000,
    };
  }

  // Fallback to generic message
  return genericErrorMessage;
}
