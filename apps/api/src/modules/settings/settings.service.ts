import { db } from '@moderators/database';
import argon2 from 'argon2';

export async function updateProfile(userId: string, data: { name?: string; email?: string }) {
  return db.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true }
  });
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) throw new Error('User not found');

  const valid = await argon2.verify(user.passwordHash, oldPassword);
  if (!valid) throw new Error('Invalid password');

  const hashedPassword = await argon2.hash(newPassword, { type: argon2.argon2id });
  return db.user.update({
    where: { id: userId },
    data: { passwordHash: hashedPassword }
  });
}

export async function updateWorkspace(workspaceId: string, data: { name?: string }) {
  return db.workspace.update({
    where: { id: workspaceId },
    data
  });
}
