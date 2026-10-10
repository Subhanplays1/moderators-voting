import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as storiesService from './stories.service';
import { authenticate } from '../../middleware/auth';
import { requireWorkspace } from '../../middleware/workspace';
import { logActivity } from '../../services/activity-log.service';
import { AnalyzeStorySchema } from './stories.schema';

export default async function storiesRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.addHook('preHandler', authenticate);
  server.addHook('preHandler', requireWorkspace);

  server.post('/analyze', async (req, reply) => {
    if (req.isMultipart()) {
      const data = await req.file();
      if (!data) return reply.code(400).send({ error: 'Bad Request', message: 'No file' });
      const buffer = await data.toBuffer();
      const result = await storiesService.analyzeScreenshot(req.workspaceId!, buffer);
      await logActivity({ workspaceId: req.workspaceId, userId: req.user.id, action: 'analyze_story_screenshot' });
      return reply.send(result);
    } else {
      const { url } = req.body as any;
      if (!url) return reply.code(400).send({ error: 'Bad Request', message: 'URL required' });
      const result = await storiesService.analyzeStory(req.workspaceId!, url);
      await logActivity({ workspaceId: req.workspaceId, userId: req.user.id, action: 'analyze_story_url' });
      return reply.send(result);
    }
  });

  server.post('/manual', async (req, reply) => {
    const { question, options } = req.body as any;
    if (!question || !options || !Array.isArray(options)) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Question and options array required' });
    }
    const result = await storiesService.createManualPoll(req.workspaceId!, { question, options });
    await logActivity({ workspaceId: req.workspaceId, userId: req.user.id, action: 'create_manual_story_poll' });
    return reply.send(result);
  });

  server.get('/:id', async (req, reply) => {
    const story = await storiesService.getStory(req.workspaceId!, req.params.id as string);
    if (!story) return reply.code(404).send({ error: 'Not Found', message: 'Story not found' });
    return reply.send({ story });
  });
}
