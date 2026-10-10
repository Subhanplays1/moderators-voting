import { z } from 'zod';
import { LoginSchema, RegisterSchema, ForgotPasswordSchema, ResetPasswordSchema } from '@moderators/shared';

export { LoginSchema, RegisterSchema, ForgotPasswordSchema, ResetPasswordSchema };

export const LoginRouteSchema = {
  body: LoginSchema
};

export const RegisterRouteSchema = {
  body: RegisterSchema
};

export const ForgotPasswordRouteSchema = {
  body: ForgotPasswordSchema
};

export const ResetPasswordRouteSchema = {
  body: ResetPasswordSchema
};
