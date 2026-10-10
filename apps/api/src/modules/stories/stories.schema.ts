import { z } from 'zod';

export const AnalyzeStorySchema = z.object({
  url: z.string().url().optional()
});
