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
  context: z.string().optional()
});

export const InstagramSessionConnectSchema = z.object({
  sessionId: z.string().min(5)
});

