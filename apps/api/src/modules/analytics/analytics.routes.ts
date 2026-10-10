import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as analyticsService from './analytics.service';
import { authenticate } from '../../middleware/auth';
import { requireWorkspace } from '../../middleware/workspace';
import { requirePermission } from '../../config/permissions';

export default async function analyticsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.addHook('preHandler', authenticate);
  server.addHook('preHandler', requireWorkspace);
  server.addHook('preHandler', requirePermission('view_analytics'));

  server.get('/overview', async (req, reply) => {
    const data = await analyticsService.getOverview(req.workspaceId!);
    return reply.send(data);
  });

  server.get('/sessions', async (req, reply) => {
    const data = await analyticsService.getSessionsChart(req.workspaceId!);
    return reply.send(data);
  });

  server.get('/accounts', async (req, reply) => {
    const data = await analyticsService.getAccountsChart(req.workspaceId!);
    return reply.send(data);
  });

  server.get('/team', async (req, reply) => {
    const data = await analyticsService.getTeamActivity(req.workspaceId!);
    return reply.send(data);
  });
}
