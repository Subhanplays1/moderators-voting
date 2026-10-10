import fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { config } from './config';
import { errorHandler } from './middleware/error-handler';

// Modules
import authRoutes from './modules/auth/auth.routes';
import workspaceRoutes from './modules/workspace/workspace.routes';
import accountsRoutes from './modules/accounts/accounts.routes';
import storiesRoutes from './modules/stories/stories.routes';
import sessionsRoutes from './modules/sessions/sessions.routes';
import teamRoutes from './modules/team/team.routes';
import logsRoutes from './modules/logs/logs.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import adminRoutes from './modules/admin/admin.routes';
import settingsRoutes from './modules/settings/settings.routes';
import setupWebSocket from './websocket';

const server = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(cors, { 
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. mobile apps, curl) or any LAN / web origin
    cb(null, true);
  }, 
  credentials: true 
});
server.register(cookie);
server.register(helmet);
server.register(rateLimit, { max: 100, timeWindow: 60000 });
server.register(websocket);
server.register(multipart);

server.setErrorHandler(errorHandler);

server.register(async (app) => {
  app.register(authRoutes, { prefix: '/auth' });
  app.register(workspaceRoutes, { prefix: '/workspaces' });
  app.register(accountsRoutes, { prefix: '/accounts' });
  app.register(storiesRoutes, { prefix: '/stories' });
  app.register(sessionsRoutes, { prefix: '/sessions' });
  app.register(teamRoutes, { prefix: '/team' });
  app.register(logsRoutes, { prefix: '/logs' });
  app.register(analyticsRoutes, { prefix: '/analytics' });
  app.register(adminRoutes, { prefix: '/admin' });
  app.register(settingsRoutes, { prefix: '/settings' });
}, { prefix: '/api' });

server.register(setupWebSocket, { prefix: '/ws' });

const start = async () => {
  try {
    await server.listen({ port: config.PORT, host: '0.0.0.0' });
    server.log.info(`Server listening on port ${config.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
