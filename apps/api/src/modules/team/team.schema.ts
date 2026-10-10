import { z } from 'zod';

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER'])
});

export const AcceptInviteSchema = z.object({
  token: z.string(),
  name: z.string().optional(),
  password: z.string().optional() // Optional if user already exists
});

export const UpdateMemberSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER'])
});
