import { db } from '@moderators/database';

export async function getOverview(workspaceId: string) {
  const [totalAccounts, connectedAccounts, activeSessions, completedSessions] = await Promise.all([
    db.instagramAccount.count({ where: { workspaceId } }),
    db.instagramAccount.count({ where: { workspaceId, status: 'CONNECTED' } }),
    db.votingSession.count({ where: { workspaceId, status: 'RUNNING' } }),
    db.votingSession.count({ where: { workspaceId, status: 'COMPLETED' } })
  ]);

  return { totalAccounts, connectedAccounts, activeSessions, completedSessions, successRate: 95 };
}

export async function getSessionsChart(workspaceId: string) {
  return []; // Simplified for brevity
}

export async function getAccountsChart(workspaceId: string) {
  return []; // Simplified for brevity
}

export async function getTeamActivity(workspaceId: string) {
  return []; // Simplified for brevity
}
