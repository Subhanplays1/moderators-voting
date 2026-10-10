import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as logsService from './logs.service';
import { authenticate } from '../../middleware/auth';
import { requireWorkspace } from '../../middleware/workspace';
import { requirePermission } from '../../config/permissions';

export default async function logsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.addHook('preHandler', authenticate);
  server.addHook('preHandler', requireWorkspace);

  server.get('/', { preHandler: [requirePermission('view_analytics')] }, async (req, reply) => {
    const data = await logsService.getLogs(req.workspaceId!, req.query);
    return reply.send(data);
  });
}
