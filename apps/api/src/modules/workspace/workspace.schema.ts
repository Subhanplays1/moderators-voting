import { z } from 'zod';

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).optional()
});

export const UpdateWorkspaceRouteSchema = {
  body: UpdateWorkspaceSchema
};
