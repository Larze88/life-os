import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen`)
  .max(PASSWORD_MAX_LENGTH);

export const setupRequestSchema = z.object({ password: passwordSchema });
export type SetupRequest = z.infer<typeof setupRequestSchema>;

export const loginRequestSchema = z.object({
  // No length rules on login: never reveal the policy for existing passwords.
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  newPassword: passwordSchema,
});
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

export const authStatusSchema = z.object({
  /** True until the initial password has been set. */
  setupRequired: z.boolean(),
  authenticated: z.boolean(),
});
export type AuthStatus = z.infer<typeof authStatusSchema>;

export const sessionInfoSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  expiresAt: z.string(),
  deviceLabel: z.string().nullable(),
  current: z.boolean(),
});
export type SessionInfo = z.infer<typeof sessionInfoSchema>;
