import { z } from 'zod';

export const CreateSessionSchema = z.object({
  pollId: z.string(),
  selectedOption: z.string().optional(),
  optionId: z.string().optional(),
  name: z.string().optional(),
  targetVotes: z.number().int().positive().optional().default(100),
});
