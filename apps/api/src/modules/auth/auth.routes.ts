import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as authService from './auth.service';
import { LoginRouteSchema, RegisterRouteSchema, ForgotPasswordRouteSchema, ResetPasswordRouteSchema } from './auth.schema';
import { authenticate } from '../../middleware/auth';
import { logActivity } from '../../services/activity-log.service';

export default async function authRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post('/login', { schema: LoginRouteSchema }, async (req, reply) => {
    const { email, password } = req.body;
    try {
      const { user, token } = await authService.login(email, password);
      await logActivity({ userId: user.id, action: 'login', status: 'success', ip: req.ip });
      reply.setCookie('token', token, { 
        httpOnly: true, 
        path: '/', 
        sameSite: 'none', 
        secure: true, 
        maxAge: 365 * 24 * 60 * 60 
      });
      const safeUser = { id: user.id, email: user.email, name: user.name };
      return reply.send({ user: safeUser, token });
    } catch (error) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid credentials' });
    }
  });

  server.post('/register', { schema: RegisterRouteSchema }, async (req, reply) => {
    try {
      const { user, token } = await authService.register(req.body);
      await logActivity({ userId: user.id, action: 'register', status: 'success', ip: req.ip });
      reply.setCookie('token', token, { 
        httpOnly: true, 
        path: '/', 
        sameSite: 'none', 
        secure: true, 
        maxAge: 365 * 24 * 60 * 60 
      });
      const safeUser = { id: user.id, email: user.email, name: user.name };
      return reply.send({ user: safeUser, token });
    } catch (error: any) {
      req.log.error(error);
      return reply.code(400).send({ 
        error: 'Bad Request', 
        message: error?.message || 'Registration failed' 
      });
    }
  });

  server.post('/logout', async (req, reply) => {
    reply.clearCookie('token', { path: '/', sameSite: 'none', secure: true });
    return reply.send({ success: true });
  });

  server.post('/forgot-password', { schema: ForgotPasswordRouteSchema }, async (req, reply) => {
    await authService.forgotPassword(req.body.email);
    return reply.send({ success: true });
  });

  server.post('/reset-password', { schema: ResetPasswordRouteSchema }, async (req, reply) => {
    try {
      await authService.resetPassword(req.body.token, req.body.newPassword);
      return reply.send({ success: true });
    } catch (error) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Reset failed' });
    }
  });

  server.get('/me', { preHandler: [authenticate] }, async (req, reply) => {
    const profile = await authService.getProfile(req.user.id);
    if (!profile) {
      return reply.code(404).send({ error: 'Not Found', message: 'User not found' });
    }
    const { passwordHash, resetToken, ...safeProfile } = profile as any;
    return reply.send({ user: safeProfile });
  });
}
