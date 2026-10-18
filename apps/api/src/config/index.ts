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
  JWT_EXPIRES_IN: z.string().default('365d'),
  ENCRYPTION_KEY: z.string().min(16).default('0123456789abcdef0123456789abcdef'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('https://dist-one-nu-24.vercel.app'),
  INSTAGRAM_PROVIDER: z.enum(['mock', 'production']).default('production'),
  INSTAGRAM_APP_ID: z.string().default('3287637704761715'),
  INSTAGRAM_APP_SECRET: z.string().default('a61a914e2a8686314a41c1d2380d8814'),
  INSTAGRAM_REDIRECT_URI: z.string().default('https://moderators-api.onrender.com/api/accounts/oauth/instagram/callback'),
  INSTAGRAM_PROXY: z.string().optional().default(''),
  DEFAULT_PROXY: z.string().optional().default('')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
