import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as settingsService from './settings.service';
import { authenticate } from '../../middleware/auth';
import { requireWorkspace } from '../../middleware/workspace';
import { requirePermission } from '../../config/permissions';
import { UpdateProfileSchema, ChangePasswordSchema, UpdateWorkspaceSettingsSchema } from './settings.schema';

export default async function settingsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.addHook('preHandler', authenticate);

  server.patch('/profile', { schema: { body: UpdateProfileSchema } }, async (req, reply) => {
    const profile = await settingsService.updateProfile(req.user.id, req.body);
    return reply.send({ profile });
  });

  server.post('/change-password', { schema: { body: ChangePasswordSchema } }, async (req, reply) => {
    try {
      await settingsService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.code(400).send({ error: 'Bad Request', message: err.message });
    }
  });

  server.patch('/workspace', { 
    schema: { body: UpdateWorkspaceSettingsSchema },
    preHandler: [requireWorkspace, requirePermission('manage_workspace')]
  }, async (req, reply) => {
    const workspace = await settingsService.updateWorkspace(req.workspaceId!, req.body);
    return reply.send({ workspace });
  });
}
