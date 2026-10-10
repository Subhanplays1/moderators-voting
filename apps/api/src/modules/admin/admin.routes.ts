import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as adminService from './admin.service';
import { authenticate } from '../../middleware/auth';
import { requireWorkspace } from '../../middleware/workspace';
import { requirePermission } from '../../config/permissions';

export default async function adminRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.addHook('preHandler', authenticate);
  server.addHook('preHandler', requireWorkspace);
  server.addHook('preHandler', requirePermission('system_admin')); // Simplified check for OWNER

  server.get('/health', async (req, reply) => {
    const data = await adminService.getSystemHealth();
    return reply.send(data);
  });

  server.get('/overview', async (req, reply) => {
    const data = await adminService.getOverview();
    return reply.send(data);
  });
}
