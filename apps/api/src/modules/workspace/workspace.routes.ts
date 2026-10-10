import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as workspaceService from './workspace.service';
import { authenticate } from '../../middleware/auth';
import { requireWorkspace } from '../../middleware/workspace';
import { requirePermission } from '../../config/permissions';

export default async function workspaceRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.addHook('preHandler', authenticate);
  server.addHook('preHandler', requireWorkspace);

  server.get('/', async (req, reply) => {
    const workspace = await workspaceService.getWorkspace(req.workspaceId!);
    return reply.send({ workspace });
  });

  server.patch('/:id', { preHandler: [requirePermission('manage_workspace')] }, async (req, reply) => {
    if (req.params.id !== req.workspaceId) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Workspace mismatch' });
    }
    const updated = await workspaceService.updateWorkspace(req.workspaceId!, req.body);
    return reply.send({ workspace: updated });
  });
}
