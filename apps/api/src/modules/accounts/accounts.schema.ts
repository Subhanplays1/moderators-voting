import { z } from 'zod';

export const CreateAccountSchema = z.object({
  username: z.string().min(1),
  displayName: z.string().optional()
});

export const ImportAccountsSchema = z.object({});

export const InstagramLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export const InstagramTwoFactorSchema = z.object({
  username: z.string().min(1),
  code: z.string().min(1),
  context: z.string().optional(),
  method: z.string().optional()
});

export const InstagramResendTwoFactorSchema = z.object({
  username: z.string().min(1),
  context: z.string().optional(),
  method: z.enum(['sms', 'whatsapp']).optional().default('sms')
});

export const InstagramPollApprovalSchema = z.object({
  username: z.string().min(1),
  context: z.string().optional()
});

export const InstagramSessionConnectSchema = z.object({
  sessionId: z.string().min(5),
  username: z.string().optional()
});


