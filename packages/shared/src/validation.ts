import { z } from 'zod';

// ==========================================
// Auth Schemas
// ==========================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters').max(100).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Aliases for compatibility
export const LoginSchema = loginSchema;
export const RegisterSchema = registerSchema;
export const ForgotPasswordSchema = forgotPasswordSchema;
export const ResetPasswordSchema = resetPasswordSchema;

// ==========================================
// Account Schemas
// ==========================================

export const createAccountSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(100)
    .regex(/^[a-zA-Z0-9._]+$/, 'Username can only contain letters, numbers, dots, and underscores'),
  displayName: z.string().max(200).optional(),
});

export const importAccountsSchema = z.object({
  accounts: z.array(
    z.object({
      username: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9._]+$/),
      status: z.enum(['pending', 'connected']).default('pending').optional(),
    })
  ).min(1, 'At least one account is required').max(10000, 'Maximum 10,000 accounts per import'),
});

// ==========================================
// Story Schemas
// ==========================================

export const analyzeStorySchema = z.object({
  url: z.string().url('Invalid URL').optional(),
  manualPoll: z.object({
    question: z.string().min(1, 'Question is required'),
    options: z.array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
      })
    ).min(2, 'At least 2 options required').max(4, 'Maximum 4 options'),
  }).optional(),
}).refine(
  (data) => data.url || data.manualPoll,
  'Either a URL or manual poll data is required'
);

// ==========================================
// Session Schemas
// ==========================================

export const createSessionSchema = z.object({
  pollId: z.string().uuid('Invalid poll ID'),
  selectedOption: z.string().min(1, 'Selected option is required'),
  name: z.string().max(200).optional(),
  accountIds: z.array(z.string().uuid()).optional(), // If empty, use all connected accounts
});

// ==========================================
// Team Schemas
// ==========================================

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MODERATOR', 'VIEWER']),
});

export const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'MODERATOR', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  name: z.string().min(2, 'Name is required').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ==========================================
// Settings Schemas
// ==========================================

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url().optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// ==========================================
// Pagination Schema
// ==========================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const logsFilterSchema = paginationSchema.extend({
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ==========================================
// Type exports from schemas
// ==========================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type ImportAccountsInput = z.infer<typeof importAccountsSchema>;
export type AnalyzeStoryInput = z.infer<typeof analyzeStorySchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type LogsFilterInput = z.infer<typeof logsFilterSchema>;
