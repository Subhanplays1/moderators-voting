import { db } from '@moderators/database';

export async function logActivity(params: {
  workspaceId?: string;
  userId?: string;
  action: string;
  target?: string;
  status?: string;
  ip?: string;
  userAgent?: string;
  metadata?: any;
}) {
  const safeMetadata = { ...params.metadata };
  if (safeMetadata.password) delete safeMetadata.password;
  if (safeMetadata.token) delete safeMetadata.token;

  await db.activityLog.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      action: params.action,
      target: params.target,
      status: params.status,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: params.metadata ? JSON.stringify(safeMetadata) : null
    }
  });
}
