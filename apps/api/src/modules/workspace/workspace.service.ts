import { db } from '@moderators/database';

export async function getWorkspace(id: string) {
  return db.workspace.findUnique({
    where: { id }
  });
}

export async function updateWorkspace(id: string, data: any) {
  return db.workspace.update({
    where: { id },
    data
  });
}

export async function getWorkspaceMembers(workspaceId: string) {
  return db.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}
