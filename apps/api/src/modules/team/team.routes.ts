import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as teamService from './team.service';
import { authenticate } from '../../middleware/auth';
import { requireWorkspace } from '../../middleware/workspace';
import { requirePermission } from '../../config/permissions';
import { InviteMemberSchema, AcceptInviteSchema, UpdateMemberSchema } from './team.schema';
import { logActivity } from '../../services/activity-log.service';

export default async function teamRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post('/accept-invite', { schema: { body: AcceptInviteSchema } }, async (req, reply) => {
    const user = await teamService.acceptInvite(req.body.token, req.body);
    return reply.send({ success: true });
  });

  server.addHook('preHandler', authenticate);
  server.addHook('preHandler', requireWorkspace);

  server.get('/', async (req, reply) => {
    const members = await teamService.listMembers(req.workspaceId!);
    return reply.send({ members });
  });

  server.get('/invitations', { preHandler: [requirePermission('team.view')] }, async (req, reply) => {
    const invitations = await teamService.getInvitations(req.workspaceId!);
    return reply.send({ invitations });
  });

  server.post('/invite', { schema: { body: InviteMemberSchema }, preHandler: [requirePermission('team.invite')] }, async (req, reply) => {
    const invite = await teamService.inviteMember(req.workspaceId!, { ...req.body, invitedBy: req.user.id });
    await logActivity({ workspaceId: req.workspaceId, userId: req.user.id, action: 'invite_member', target: req.body.email });
    return reply.send({ invite });
  });

  server.patch('/:id', { schema: { body: UpdateMemberSchema }, preHandler: [requirePermission('team.update')] }, async (req, reply) => {
    const member = await teamService.updateMember(req.workspaceId!, req.params.id as string, req.body.role);
    await logActivity({ workspaceId: req.workspaceId, userId: req.user.id, action: 'update_member', target: req.params.id as string });
    return reply.send({ member });
  });

  server.delete('/:id', { preHandler: [requirePermission('team.remove')] }, async (req, reply) => {
    await teamService.removeMember(req.workspaceId!, req.params.id as string);
    await logActivity({ workspaceId: req.workspaceId, userId: req.user.id, action: 'remove_member', target: req.params.id as string });
    return reply.send({ success: true });
  });
}
