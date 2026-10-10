import { db } from '@moderators/database';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config';

export async function register(input: any) {
  const hashedPassword = await argon2.hash(input.password, { type: argon2.argon2id });
  const workspaceName = input.workspaceName || `${input.name}'s Workspace`;
  const slug = `${workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;
  
  // Use a transaction to create user, workspace, and link as owner
  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash: hashedPassword,
        name: input.name,
      }
    });

    const workspace = await tx.workspace.create({
      data: {
        name: workspaceName,
        slug,
        ownerId: user.id,
      }
    });

    await tx.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: 'OWNER',
      }
    });

    return { user, workspace };
  });
  
  const token = generateToken(result.user.id);
  return { user: result.user, token };
}

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  
  if (!user || !user.passwordHash) {
    throw new Error('Invalid credentials');
  }
  
  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    throw new Error('Invalid credentials');
  }
  
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  
  const token = generateToken(user.id);
  return { user, token };
}

export function generateToken(userId: string) {
  return jwt.sign({ id: userId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

export async function forgotPassword(email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    await db.user.update({
      where: { email },
      data: { resetToken: token }
    });
    if (config.NODE_ENV === 'development') {
      console.log(`Reset token for ${email}: ${token}`);
    }
  }
  return { token };
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await db.user.findFirst({ where: { resetToken: token } });
  if (!user) {
    throw new Error('Invalid or expired token');
  }
  const hashedPassword = await argon2.hash(newPassword, { type: argon2.argon2id });
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashedPassword, resetToken: null }
  });
  return { success: true };
}

export async function getProfile(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    include: {
      workspaceMembers: {
        include: {
          workspace: true
        }
      }
    }
  });
}
