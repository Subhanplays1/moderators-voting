import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Try loading from current dir, then root dir
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://user:password@localhost:5432/moderators?schema=public'),
  JWT_SECRET: z.string().default('your-jwt-secret-min-32-chars-long-change-this'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  ENCRYPTION_KEY: z.string().min(16).default('0123456789abcdef0123456789abcdef'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  INSTAGRAM_PROVIDER: z.enum(['mock', 'production']).default('mock'),
  INSTAGRAM_APP_ID: z.string().optional().default(''),
  INSTAGRAM_APP_SECRET: z.string().optional().default(''),
  INSTAGRAM_REDIRECT_URI: z.string().optional().default('http://localhost:3001/api/accounts/oauth/instagram/callback')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
