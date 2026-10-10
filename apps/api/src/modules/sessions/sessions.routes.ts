import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as sessionsService from './sessions.service';
import { authenticate } from '../../middleware/auth';
import { requireWorkspace } from '../../middleware/workspace';
import { logActivity } from '../../services/activity-log.service';
import { CreateSessionSchema } from './sessions.schema';

export default async function sessionsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.addHook('preHandler', authenticate);
  server.addHook('preHandler', requireWorkspace);

  server.get('/', async (req, reply) => {
    const sessions = await sessionsService.listSessions(req.workspaceId!);
    return reply.send({ sessions });
  });

  server.post('/', { schema: { body: CreateSessionSchema } }, async (req, reply) => {
    const session = await sessionsService.createSession(req.workspaceId!, { ...req.body, createdBy: req.user.id });
    await logActivity({ workspaceId: req.workspaceId, userId: req.user.id, action: 'create_session', target: session.id });
    return reply.send({ session });
  });

  server.get('/:id', async (req, reply) => {
    const session = await sessionsService.getSession(req.workspaceId!, req.params.id as string);
    if (!session) return reply.code(404).send({ error: 'Not Found', message: 'Session not found' });
    return reply.send({ session });
  });

  server.post('/:id/start', async (req, reply) => {
    await sessionsService.startSession(req.workspaceId!, req.params.id as string);
    await logActivity({ workspaceId: req.workspaceId, userId: req.user.id, action: 'start_session', target: req.params.id as string });
    return reply.send({ success: true });
  });

  server.post('/:id/stop', async (req, reply) => {
    await sessionsService.stopSession(req.workspaceId!, req.params.id as string);
    await logActivity({ workspaceId: req.workspaceId, userId: req.user.id, action: 'stop_session', target: req.params.id as string });
    return reply.send({ success: true });
  });
}
