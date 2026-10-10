import { db } from '@moderators/database';
import { getInstagramProvider } from '../../providers/instagram';
import { wsManager } from '../../websocket/manager';
import https from 'https';

function submitInstagramStoryVote(params: {
  sessionId: string;
  mediaId: string;
  pollId: string;
  voteIndex: number;
}): Promise<{ success: boolean; status?: number; data?: any; error?: string }> {
  return new Promise((resolve) => {
    const uid = params.sessionId.split('%3A')[0] || params.sessionId.split(':')[0] || '';
    const payload = {
      _uid: uid,
      radio_type: 'wifi-none',
      vote: String(params.voteIndex),
    };
    const body = `signed_body=SIGNATURE.${encodeURIComponent(JSON.stringify(payload))}`;

    const req = https.request({
      hostname: 'i.instagram.com',
      port: 443,
      path: `/api/v1/media/${params.mediaId}/${params.pollId}/story_poll_vote/`,
      method: 'POST',
      headers: {
        'User-Agent': 'Instagram 361.0.0.46.88 Android (28/9; 300dpi; 900x1600; Asus; ASUS_Z01QD; ASUS_Z01QD; intel; en_US; 674675155)',
        'Cookie': `sessionid=${params.sessionId};`,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(body),
        'Accept': '*/*',
        'Connection': 'close',
      }
    }, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(rawData);
          console.log(`[Sessions Service] Instagram Vote HTTP ${res.statusCode}:`, json);
          if (res.statusCode === 200 && json?.status === 'ok') {
            resolve({ success: true, status: res.statusCode, data: json });
          } else {
            const errMsg = json?.message === 'login_required' 
              ? 'Instagram session expired (login_required). Please re-enter sessionid in Accounts.' 
              : (json?.message || `Instagram returned HTTP ${res.statusCode}`);
            resolve({ success: false, status: res.statusCode, error: errMsg, data: json });
          }
        } catch {
          resolve({ success: false, status: res.statusCode, error: `Invalid response from Instagram (HTTP ${res.statusCode})` });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Sessions Service] Instagram Request Error:', err);
      resolve({ success: false, error: err.message });
    });

    req.write(body);
    req.end();
  });
}

export async function createSession(workspaceId: string, data: { pollId: string; optionId?: string; selectedOption?: string; name?: string; targetVotes?: number; createdBy: string }) {
  const accounts = await db.instagramAccount.findMany({ 
    where: { 
      workspaceId,
      status: 'CONNECTED',
      encryptedToken: { not: null }
    } 
  });
  
  const chosenOption = data.selectedOption || data.optionId || 'Option A';

  if (accounts.length === 0) {
    throw new Error('No connected Instagram accounts available. Please connect an account with a valid session in Accounts first.');
  }

  const session = await db.votingSession.create({
    data: {
      workspaceId,
      pollId: data.pollId,
      name: data.name || `Session #${Date.now().toString().slice(-6)}`,
      selectedOption: chosenOption,
      totalAccounts: accounts.length,
      completed: 0,
      failed: 0,
      createdById: data.createdBy,
      status: 'DRAFT'
    }
  });

  await db.votingSessionAccount.createMany({
    data: accounts.map(acc => ({
      sessionId: session.id,
      accountId: acc.id,
      status: 'PENDING'
    }))
  });

  return session;
}

export async function startSession(workspaceId: string, sessionId: string) {
  const session = await db.votingSession.findFirst({ where: { id: sessionId, workspaceId } });
  if (!session) throw new Error('Not found');

  await db.votingSession.update({ 
    where: { id: sessionId }, 
    data: { status: 'RUNNING', startedAt: new Date() } 
  });

  // Spawn worker
  processSessionAsync(workspaceId, sessionId).catch(console.error);
  
  return { success: true };
}

export async function stopSession(workspaceId: string, sessionId: string) {
  await db.votingSession.updateMany({
    where: { id: sessionId, workspaceId },
    data: { status: 'CANCELLED' }
  });
  return { success: true };
}

export async function getSession(workspaceId: string, id: string) {
  return db.votingSession.findFirst({
    where: { id, workspaceId },
    include: { sessionAccounts: { include: { account: true } } }
  });
}

export async function listSessions(workspaceId: string) {
  return db.votingSession.findMany({
    where: { workspaceId },
    include: { poll: true },
    orderBy: { createdAt: 'desc' }
  });
}

async function processSessionAsync(workspaceId: string, sessionId: string) {
  const { decrypt } = await import('../../services/encryption.service');
  const accounts = await db.votingSessionAccount.findMany({ 
    where: { sessionId },
    include: { account: true }
  });
  const session = await db.votingSession.findUnique({ 
    where: { id: sessionId },
    include: { poll: { include: { story: true } } }
  });
  if (!session) return;

  // Determine vote index (0 or 1) based on selected option vs poll options
  let voteIndex = 0;
  try {
    if (session.poll?.options) {
      const opts = typeof session.poll.options === 'string' ? JSON.parse(session.poll.options) : session.poll.options;
      const foundIdx = opts.findIndex((opt: string) => opt.toLowerCase() === session.selectedOption.toLowerCase());
      if (foundIdx >= 0) voteIndex = foundIdx;
    }
  } catch {}

  // Parse Story media ID and Poll ID from metadata or poll model
  let mediaId = '';
  let pollId = session.pollId;
  let rawPk = '';
  let storyUserPk = '';
  try {
    if (session.poll?.story?.metadata) {
      const meta = typeof session.poll.story.metadata === 'string' ? JSON.parse(session.poll.story.metadata) : session.poll.story.metadata;
      if (meta?.mediaId) mediaId = String(meta.mediaId);
      if (meta?.pollId) pollId = String(meta.pollId);
      if (meta?.pk) rawPk = String(meta.pk);
      if (meta?.userPk) storyUserPk = String(meta.userPk);
    }
  } catch {}

  // Only process actual accounts
  const runList = accounts.filter(a => a.account?.encryptedToken);

  let completedCount = 0;
  let failedCount = 0;

  for (const accItem of runList) {
    const currentSession = await db.votingSession.findUnique({ where: { id: sessionId } });
    if (currentSession?.status !== 'RUNNING') break;

    let voteSuccess = false;
    let voteError = '';

    // If real connected Instagram account
    if (accItem.account?.encryptedToken) {
      try {
        const decrypted = decrypt(accItem.account.encryptedToken);
        let sessionCookie = '';
        if (decrypted.startsWith('Bearer IGT:2:')) {
          const rawJson = Buffer.from(decrypted.replace('Bearer IGT:2:', ''), 'base64').toString('utf8');
          const parsed = JSON.parse(rawJson);
          sessionCookie = parsed.sessionid || '';
        }

        const voterUid = sessionCookie.split('%3A')[0] || sessionCookie.split(':')[0] || '';

        // Prevent voting on own story (Instagram rejects self-voting with 403)
        if (storyUserPk && voterUid === storyUserPk) {
          voteError = 'Self-voting blocked: Instagram does not allow voting on your own story.';
          voteSuccess = false;
          console.warn(`[Sessions Service] Cannot vote on own story: voter ${voterUid} == author ${storyUserPk}`);
        } else if (sessionCookie && (mediaId || rawPk) && pollId) {
          const targetMedia = rawPk || mediaId.split('_')[0] || mediaId;
          console.log(`[Sessions Service] Sending real Instagram vote to media ${targetMedia}, poll ${pollId}, index ${voteIndex} for ${accItem.account.username}...`);

          const voteRes = await submitInstagramStoryVote({
            sessionId: sessionCookie,
            mediaId: targetMedia,
            pollId,
            voteIndex
          });

          if (voteRes.success) {
            voteSuccess = true;
          } else {
            voteSuccess = false;
            voteError = voteRes.error || 'Failed to submit vote to Instagram';
            console.error(`[Sessions Service] Vote failed for ${accItem.account.username}:`, voteError);

            // If session expired or logged out, mark account as DISCONNECTED
            if (voteRes.data?.message === 'login_required' || voteRes.error?.includes('login_required')) {
              await db.instagramAccount.update({
                where: { id: accItem.account.id },
                data: {
                  status: 'DISCONNECTED',
                  statusMessage: 'Session expired (login_required). Please re-enter Session ID.',
                  lastCheckedAt: new Date()
                }
              }).catch(() => {});
            }
          }
        } else {
          voteError = 'Missing session cookie or poll details';
          voteSuccess = false;
        }
      } catch (err: any) {
        voteError = err.message || 'Vote failed';
        voteSuccess = false;
      }
    } else {
      voteError = 'Account is not connected with a valid token';
      voteSuccess = false;
    }

    if (voteSuccess) {
      completedCount++;
      if (accItem.id) {
        await db.votingSessionAccount.update({
          where: { id: accItem.id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        }).catch(() => {});
      }
    } else {
      failedCount++;
      if (accItem.id) {
        await db.votingSessionAccount.update({
          where: { id: accItem.id },
          data: { status: 'FAILED', error: voteError || 'Failed to submit vote' }
        }).catch(() => {});
      }
    }

    await db.votingSession.update({
      where: { id: sessionId },
      data: { completed: completedCount, failed: failedCount }
    });

    wsManager.broadcast(workspaceId, { 
      type: 'session:progress', 
      payload: { sessionId, completed: completedCount, failed: failedCount, total: runList.length } 
    });
  }

  const finalCheck = await db.votingSession.findUnique({ where: { id: sessionId } });
  if (finalCheck?.status === 'RUNNING') {
    await db.votingSession.update({ 
      where: { id: sessionId }, 
      data: { status: 'COMPLETED', completedAt: new Date() } 
    });
    wsManager.broadcast(workspaceId, { 
      type: 'session:complete', 
      payload: { sessionId } 
    });
  }
}
