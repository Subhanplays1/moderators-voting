import { FastifyReply, FastifyRequest } from 'fastify';
import { hasPermission, Permission } from '@moderators/shared';

export { hasPermission };

export function requirePermission(permission: Permission) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.workspaceMember) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Not a workspace member' });
    }
    
    if (!hasPermission(req.workspaceMember.role as any, permission)) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
  };
}
