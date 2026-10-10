import { db } from '@moderators/database';

export async function getSystemHealth() {
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: 'OK', database: 'connected', websocket: 'running', storage: 'available' };
  } catch (error) {
    return { status: 'ERROR', database: 'disconnected', websocket: 'running', storage: 'available' };
  }
}

export async function getOverview() {
  const [totalWorkspaces, totalUsers, totalAccounts, totalSessions] = await Promise.all([
    db.workspace.count(),
    db.user.count(),
    db.account.count(),
    db.votingSession.count()
  ]);

  return { totalWorkspaces, totalUsers, totalAccounts, totalSessions };
}
