import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional()
});

export const ChangePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(8)
});

export const UpdateWorkspaceSettingsSchema = z.object({
  name: z.string().min(1).optional()
});
