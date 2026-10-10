import { db } from '@moderators/database';

export async function getLogs(workspaceId: string, filters: any) {
  const where: any = { workspaceId };
  if (filters.action) where.action = filters.action;
  if (filters.userId) where.userId = filters.userId;
  
  const take = filters.limit ? parseInt(filters.limit) : 50;
  const skip = filters.offset ? parseInt(filters.offset) : 0;

  const [logs, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: { user: { select: { id: true, name: true, email: true } } }
    }),
    db.activityLog.count({ where })
  ]);

  return { logs, total, limit: take, offset: skip };
}
