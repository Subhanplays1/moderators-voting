import { db } from '@moderators/database';
import crypto from 'crypto';
import argon2 from 'argon2';

export async function listMembers(workspaceId: string) {
  return db.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } }
  });
}

export async function inviteMember(workspaceId: string, data: { email: string; role: string; invitedBy: string }) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return db.invitation.create({
    data: {
      workspaceId,
      email: data.email,
      role: data.role,
      invitedById: data.invitedBy,
      token,
      expiresAt
    }
  });
}

export async function getInvitations(workspaceId: string) {
  return db.invitation.findMany({ where: { workspaceId, status: 'PENDING' } });
}

export async function acceptInvite(token: string, data: { name?: string; password?: string }) {
  const invitation = await db.invitation.findUnique({ where: { token } });
  if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
    throw new Error('Invalid or expired token');
  }

  let user = await db.user.findUnique({ where: { email: invitation.email } });
  
  if (!user) {
    if (!data.name || !data.password) throw new Error('Name and password required for new users');
    const hashedPassword = await argon2.hash(data.password, { type: argon2.argon2id });
    user = await db.user.create({
      data: { email: invitation.email, name: data.name, passwordHash: hashedPassword }
    });
  }

  await db.workspaceMember.create({
    data: { workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role }
  });

  await db.invitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED' } });
  return user;
}

export async function updateMember(workspaceId: string, userId: string, role: string) {
  return db.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId } },
    data: { role }
  });
}

export async function removeMember(workspaceId: string, userId: string) {
  return db.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId } }
  });
}
