import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as accountsService from './accounts.service';
import { authenticate } from '../../middleware/auth';
import { requireWorkspace } from '../../middleware/workspace';
import { requirePermission } from '../../config/permissions';
import { CreateAccountSchema, InstagramLoginSchema, InstagramTwoFactorSchema, InstagramSessionConnectSchema } from './accounts.schema';
import { logActivity } from '../../services/activity-log.service';
import { ProductionProvider } from '../../providers/instagram/production.provider';
import { config } from '../../config';
import { db } from '@moderators/database';

export default async function accountsRoutes(app: FastifyInstance) {
  // -------------------------------------------------------------
  // Public Instagram OAuth Redirect & Callback Routes
  // (No preHandler authentication hooks so browser redirects work)
  // -------------------------------------------------------------
  
  // 1. Initiate Real Instagram Login (Redirect user to Instagram Login Dialog)
  app.get('/oauth/instagram/authorize', async (req, reply) => {
    const token = (req.query as any)?.token || req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    let userId = '';
    let workspaceId = '';

    if (token) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, config.JWT_SECRET) as { id: string };
        userId = decoded.id;
        const member = await db.workspaceMember.findFirst({ where: { userId } });
        if (member) workspaceId = member.workspaceId;
      } catch {}
    }

    if (!workspaceId) {
      const firstWs = await db.workspace.findFirst();
      workspaceId = firstWs?.id || '';
    }

    const provider = new ProductionProvider();
    const statePayload = Buffer.from(JSON.stringify({
      workspaceId,
      userId
    })).toString('base64');

    if (!config.INSTAGRAM_APP_ID) {
      return reply.code(400).send({
        error: 'Configuration Missing',
        message: 'To use official Instagram Login, set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in your .env file.'
      });
    }

    const authUrl = provider.getAuthorizationUrl(statePayload);
    return reply.redirect(authUrl);
  });

  // 2. Instagram OAuth Callback (Instagram returns authorization code here)
  app.get('/oauth/instagram/callback', async (req, reply) => {
    const query = req.query as { code?: string; state?: string; error?: string; error_description?: string };

    if (query.error || !query.code) {
      return reply.redirect(`${config.FRONTEND_URL}/accounts?oauth_error=${encodeURIComponent(query.error_description || 'User denied access')}`);
    }

    try {
      const stateData = JSON.parse(Buffer.from(query.state || '', 'base64').toString('utf8'));
      const provider = new ProductionProvider();
      
      const cleanCode = (query.code || '').replace(/#_$/, '');
      const { accessToken, userId } = await provider.exchangeCodeForToken(cleanCode);
      const profile = await provider.getAccountInfo(accessToken, userId);

      const finalUsername = (profile.username && profile.username.length <= 30 && !profile.username.startsWith('IGAA'))
        ? profile.username
        : (userId ? `ig_user_${userId}` : 'instagram_account');

      await accountsService.createOrUpdateOAuthAccount({
        workspaceId: stateData.workspaceId,
        username: finalUsername,
        accessToken,
        addedById: stateData.userId
      });

      return reply.redirect(`${config.FRONTEND_URL}/accounts?oauth_success=true`);
    } catch (err: any) {
      return reply.redirect(`${config.FRONTEND_URL}/accounts?oauth_error=${encodeURIComponent(err.message || 'OAuth exchange failed')}`);
    }
  });

  // -------------------------------------------------------------
  // Authenticated Workspace Routes (Encapsulated in sub-plugin)
  // -------------------------------------------------------------
  app.register(async (authApp) => {
    const server = authApp.withTypeProvider<ZodTypeProvider>();
    server.addHook('preHandler', authenticate);
    server.addHook('preHandler', requireWorkspace);

    // Dynamic endpoint for frontend to request official Meta login URL
    server.get('/oauth/instagram/url', async (req, reply) => {
      if (!config.INSTAGRAM_APP_ID) {
        return reply.code(400).send({
          error: 'Configuration Missing',
          message: 'Instagram App credentials are not configured.'
        });
      }
      const provider = new ProductionProvider();
      const statePayload = Buffer.from(JSON.stringify({
        workspaceId: req.workspaceId,
        userId: req.user.id
      })).toString('base64');
      const url = provider.getAuthorizationUrl(statePayload);
      return reply.send({ url });
    });

    server.post('/login', {
      schema: { body: InstagramLoginSchema },
      preHandler: [requirePermission('accounts.create')]
    }, async (req, reply) => {
      const { username, password } = req.body;
      try {
        const result = await accountsService.loginInstagramDirect({
          workspaceId: req.workspaceId!,
          username,
          password,
          addedById: req.user.id
        });

        if (result.status === 'SUCCESS') {
          await logActivity({
            workspaceId: req.workspaceId,
            userId: req.user.id,
            action: 'instagram_direct_login',
            target: result.account?.id,
            status: 'success'
          });
        }

        return reply.send(result);
      } catch (err: any) {
        req.log.error(err);
        return reply.code(400).send({
          status: 'ERROR',
          message: err.message || 'Direct Instagram login failed'
        });
      }
    });

    server.post('/verify-2fa', {
      schema: { body: InstagramTwoFactorSchema },
      preHandler: [requirePermission('accounts.create')]
    }, async (req, reply) => {
      const { username, code, context } = req.body;
      try {
        const result = await accountsService.verifyInstagramTwoFactor({
          workspaceId: req.workspaceId!,
          username,
          code,
          context,
          addedById: req.user.id
        });

        if (result.status === 'SUCCESS') {
          await logActivity({
            workspaceId: req.workspaceId,
            userId: req.user.id,
            action: 'instagram_2fa_verified',
            target: result.account?.id,
            status: 'success'
          });
        }

        return reply.send(result);
      } catch (err: any) {
        req.log.error(err);
        return reply.code(400).send({
          status: 'ERROR',
          message: err.message || 'Two-factor verification failed'
        });
      }
    });

    server.post('/session-connect', {
      schema: { body: InstagramSessionConnectSchema },
      preHandler: [requirePermission('accounts.create')]
    }, async (req, reply) => {
      const { sessionId } = req.body;
      try {
        const result = await accountsService.connectWithSessionId({
          workspaceId: req.workspaceId!,
          sessionId,
          addedById: req.user.id
        });

        await logActivity({
          workspaceId: req.workspaceId,
          userId: req.user.id,
          action: 'instagram_session_cookie_connect',
          target: result.account?.id,
          status: 'success'
        });

        return reply.send(result);
      } catch (err: any) {
        req.log.error(err);
        return reply.code(400).send({
          status: 'ERROR',
          message: err.message || 'Session ID connection failed'
        });
      }
    });

    server.get('/', async (req, reply) => {
      const accounts = await accountsService.listAccounts(req.workspaceId!);
      return reply.send({ accounts });
    });

    server.post('/', { schema: { body: CreateAccountSchema }, preHandler: [requirePermission('accounts.create')] }, async (req, reply) => {
      const account = await accountsService.createAccount(req.workspaceId!, req.body, req.user.id);
      await logActivity({ workspaceId: req.workspaceId, userId: req.user.id, action: 'create_account', target: account.id });
      return reply.send({ account });
    });

    server.post('/import', { preHandler: [requirePermission('accounts.import')] }, async (req, reply) => {
      const data = await req.file();
      if (!data) return reply.code(400).send({ error: 'Bad Request', message: 'No file uploaded' });
      const buffer = await data.toBuffer();
      const result = await accountsService.importAccounts(req.workspaceId!, buffer, req.user.id);
      await logActivity({ workspaceId: req.workspaceId, userId: req.user.id, action: 'import_accounts', metadata: result });
      return reply.send(result);
    });

    server.get('/:id', async (req, reply) => {
      const account = await accountsService.getAccount(req.workspaceId!, req.params.id as string);
      if (!account) return reply.code(404).send({ error: 'Not Found', message: 'Account not found' });
      return reply.send({ account });
    });

    server.post('/:id/connect', { preHandler: [requirePermission('accounts.connect')] }, async (req, reply) => {
      const account = await accountsService.connectAccount(req.workspaceId!, req.params.id as string);
      return reply.send({ account });
    });

    server.post('/:id/disconnect', { preHandler: [requirePermission('accounts.disconnect')] }, async (req, reply) => {
      const account = await accountsService.disconnectAccount(req.workspaceId!, req.params.id as string);
      return reply.send({ account });
    });

    server.post('/:id/test', { preHandler: [requirePermission('accounts.test')] }, async (req, reply) => {
      const result = await accountsService.testConnection(req.workspaceId!, req.params.id as string);
      return reply.send({ success: result });
    });

    server.delete('/:id', { preHandler: [requirePermission('accounts.delete')] }, async (req, reply) => {
      await accountsService.removeAccount(req.workspaceId!, req.params.id as string);
      await logActivity({ workspaceId: req.workspaceId, userId: req.user.id, action: 'delete_account', target: req.params.id as string });
      return reply.send({ success: true });
    });
  });
}
