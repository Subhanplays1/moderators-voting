import { FastifyReply, FastifyRequest } from 'fastify';
import { db } from '@moderators/database';

declare module 'fastify' {
  interface FastifyRequest {
    workspaceMember?: any;
    workspaceId?: string;
  }
}

export const requireWorkspace = async (req: FastifyRequest, reply: FastifyReply) => {
  if (!req.user) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'User not authenticated' });
  }

  let workspaceId = req.headers['x-workspace-id'] as string;

  // If header not provided by client, auto-resolve user's first active workspace
  if (!workspaceId) {
    const defaultMembership = await db.workspaceMember.findFirst({
      where: { userId: req.user.id },
      include: { workspace: true }
    });
    
    if (defaultMembership) {
      workspaceId = defaultMembership.workspaceId;
      req.workspaceMember = defaultMembership;
      req.workspaceId = workspaceId;
      return;
    }

    return reply.code(400).send({ error: 'Bad Request', message: 'No workspace found for user' });
  }

  const member = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: req.user.id
      }
    }
  });

  if (!member) {
    return reply.code(403).send({ error: 'Forbidden', message: 'Not a member of this workspace' });
  }

  req.workspaceMember = member;
  req.workspaceId = workspaceId;
};
