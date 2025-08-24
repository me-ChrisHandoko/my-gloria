// Interface for the current user from Clerk auth
export interface CurrentUser {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}