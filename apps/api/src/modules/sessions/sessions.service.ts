import { db } from '@moderators/database';
import { getInstagramProvider } from '../../providers/instagram';
import { wsManager } from '../../websocket/manager';
import axios from 'axios';
import crypto from 'crypto';
import { createProxyAgent } from '../../providers/instagram/instagram-client';

const MODERN_IG_SIG_KEY = '5d406b6939d4fb10d3edb4ac0247d495b697543d3f53195deb269ec016a67911';

function getCsrfToken(cookieStr: string): string {
  const match = cookieStr.match(/csrftoken=([^;]+)/);
  if (match) return match[1];
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Marks the story as viewed/seen before voting so Instagram safety algorithms
 * recognize genuine viewer engagement (masslooker standard).
 */
async function markStorySeen(params: {
  sessionId: string;
  mediaId: string;
  authorPk?: string;
  takenAt?: number;
  proxy?: string;
}): Promise<boolean> {
  try {
    const rawSessionId = params.sessionId.replace(/^sessionid=/, '').replace(/;$/, '').trim();
    const uid = rawSessionId.split('%3A')[0] || rawSessionId.split(':')[0] || '';
    const csrf = getCsrfToken(params.sessionId);
    const mediaId = params.mediaId.split('_')[0];
    const authorPk = params.authorPk || '';
    const reelId = authorPk ? `${mediaId}_${authorPk}` : mediaId;
    const takenAt = params.takenAt || (Math.floor(Date.now() / 1000) - 180);
    const now = Math.floor(Date.now() / 1000);

    const seenPayload = JSON.stringify({
      live_vods_skipped: {},
      nuxes_skipped: {},
      nuxes: {},
      reels: {
        [reelId]: [`${takenAt}_${now}`],
      },
      live_vods: {},
      reel_media_skipped: {},
    });

    const signature = crypto.createHmac('sha256', MODERN_IG_SIG_KEY).update(seenPayload).digest('hex');
    const signedBody = `ig_sig_key_version=4&signed_body=${signature}.${encodeURIComponent(seenPayload)}`;
    const agent = createProxyAgent(params.proxy);

    const res = await axios.post('https://i.instagram.com/api/v2/media/seen/?reel=1&live_vod=0', signedBody, {
      headers: {
        'User-Agent': 'Instagram 361.0.0.46.88 Android (28/9; 300dpi; 900x1600; Asus; ASUS_Z01QD; ASUS_Z01QD; intel; en_US; 674675155)',
        'Cookie': `ds_user_id=${uid}; sessionid=${rawSessionId}; csrftoken=${csrf};`,
        'X-IG-Connection-Type': 'WIFI',
        'X-IG-Capabilities': '36r/Fx8=',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      ...(agent ? { httpsAgent: agent, httpAgent: agent, proxy: false as const } : {}),
      validateStatus: () => true,
    });
    console.log(`[Sessions Service] Story ${reelId} marked seen: status ${res.status}`);
    return res.status === 200;
  } catch (err: any) {
    console.warn(`[Sessions Service] Story seen notice warning: ${err.message}`);
    return false;
  }
}

/**
 * Submits story poll vote with dual-engine redundancy:
 * 1. Official Instagram Web AJAX endpoint (highest reliability, no signature rejection)
 * 2. Mobile Android signed API with modern HMAC key (masslooker standard)
 * 3. Slider sticker fallback (if poll is configured as a slider)
 */
async function submitInstagramStoryVote(params: {
  sessionId: string;
  mediaId: string;
  pollId: string;
  voteIndex: number;
  authorPk?: string;
  takenAt?: number;
  proxy?: string;
}): Promise<{ success: boolean; status?: number; data?: any; error?: string }> {
  const rawSessionId = params.sessionId.replace(/^sessionid=/, '').replace(/;$/, '').trim();
  const uid = rawSessionId.split('%3A')[0] || rawSessionId.split(':')[0] || '';
  const csrf = getCsrfToken(params.sessionId);
  const cleanMediaId = params.mediaId.split('_')[0];
  const cleanPollId = params.pollId;
  const agent = createProxyAgent(params.proxy);
  const proxyConfig = agent ? { httpsAgent: agent, httpAgent: agent, proxy: false as const } : {};

  // Step 1: Pre-authenticate story viewing (marks reel seen so Instagram algorithm validates engagement)
  await markStorySeen({
    sessionId: rawSessionId,
    mediaId: cleanMediaId,
    authorPk: params.authorPk,
    takenAt: params.takenAt,
    proxy: params.proxy,
  }).catch(() => {});

  // Step 2: Primary Engine - Official Instagram Web Story Poll Vote
  try {
    const webRes = await axios.post(
      `https://www.instagram.com/api/v1/media/${cleanMediaId}/${cleanPollId}/story_poll_vote/`,
      new URLSearchParams({
        vote: String(params.voteIndex),
        radio_type: 'none',
      }).toString(),
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'X-CSRFToken': csrf,
          'X-IG-App-ID': '936619743392459',
          'X-ASBD-ID': '129477',
          'X-IG-WWW-Claim': '0',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `https://www.instagram.com/stories/`,
          'Origin': 'https://www.instagram.com',
          'Cookie': `ds_user_id=${uid}; sessionid=${rawSessionId}; csrftoken=${csrf};`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        ...proxyConfig,
        validateStatus: () => true,
      }
    );

    console.log(`[Sessions Service] Instagram Web Vote HTTP ${webRes.status}:`, webRes.data);
    if (
      (webRes.status === 200 && (webRes.data?.status === 'ok' || webRes.data?.poll_sticker)) ||
      webRes.data?.message === 'Viewer has already voted' ||
      webRes.data?.message?.includes('already voted')
    ) {
      return { success: true, status: 200, data: webRes.data };
    }
  } catch (webErr: any) {
    console.warn(`[Sessions Service] Web vote attempt warning: ${webErr.message}`);
  }

  // Step 3: Secondary Engine - Mobile Android Signed API (masslooker standard)
  try {
    const jsonPayload = JSON.stringify({
      radio_type: 'none',
      vote: String(params.voteIndex),
    });
    const hashSig = crypto.createHmac('sha256', MODERN_IG_SIG_KEY).update(jsonPayload).digest('hex');
    const signedBody = `ig_sig_key_version=4&signed_body=${hashSig}.${encodeURIComponent(jsonPayload)}`;

    const mobileRes = await axios.post(
      `https://i.instagram.com/api/v1/media/${cleanMediaId}/${cleanPollId}/story_poll_vote/`,
      signedBody,
      {
        headers: {
          'User-Agent': 'Instagram 361.0.0.46.88 Android (28/9; 300dpi; 900x1600; Asus; ASUS_Z01QD; ASUS_Z01QD; intel; en_US; 674675155)',
          'Cookie': `ds_user_id=${uid}; sessionid=${rawSessionId}; csrftoken=${csrf};`,
          'X-IG-Connection-Type': 'WIFI',
          'X-IG-Capabilities': '36r/Fx8=',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        ...proxyConfig,
        validateStatus: () => true,
      }
    );

    console.log(`[Sessions Service] Instagram Mobile Vote HTTP ${mobileRes.status}:`, mobileRes.data);
    if (
      (mobileRes.status === 200 && (mobileRes.data?.status === 'ok' || mobileRes.data?.poll_sticker)) ||
      mobileRes.data?.message === 'Viewer has already voted' ||
      mobileRes.data?.message?.includes('already voted')
    ) {
      return { success: true, status: 200, data: mobileRes.data };
    }

    // Step 4: Slider sticker fallback (in case the story poll is styled as a slider)
    try {
      const sliderRes = await axios.post(
        `https://i.instagram.com/api/v1/media/${cleanMediaId}/${cleanPollId}/story_slider_vote/`,
        `ig_sig_key_version=4&signed_body=${crypto.createHmac('sha256', MODERN_IG_SIG_KEY).update(JSON.stringify({ vote: params.voteIndex === 0 ? 0.2 : 0.8 })).digest('hex')}.${encodeURIComponent(JSON.stringify({ vote: params.voteIndex === 0 ? 0.2 : 0.8 }))}`,
        {
          headers: {
            'User-Agent': 'Instagram 361.0.0.46.88 Android (28/9; 300dpi; 900x1600; Asus; ASUS_Z01QD; ASUS_Z01QD; intel; en_US; 674675155)',
            'Cookie': `ds_user_id=${uid}; sessionid=${rawSessionId}; csrftoken=${csrf};`,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          ...proxyConfig,
          validateStatus: () => true,
        }
      );
      if (sliderRes.status === 200 && sliderRes.data?.status === 'ok') {
        return { success: true, status: 200, data: sliderRes.data };
      }
    } catch {}

    let errMsg = mobileRes.data?.message || `Instagram returned HTTP ${mobileRes.status}`;
    if (mobileRes.data?.message?.includes('wait a few minutes')) {
      errMsg = 'Instagram Rate Limit: Please wait 5-10 minutes before trying again.';
    } else if (mobileRes.data?.message === 'login_required' || mobileRes.data?.message === 'user_has_logged_out') {
      errMsg = 'Instagram session expired (login_required). Please re-enter Session ID in Accounts.';
    }
    return { success: false, status: mobileRes.status, error: errMsg, data: mobileRes.data };
  } catch (mobileErr: any) {
    return { success: false, error: mobileErr.message || 'Network error submitting vote to Instagram' };
  }
}

export async function createSession(workspaceId: string, data: { pollId: string; optionId?: string; selectedOption?: string; name?: string; targetVotes?: number; createdBy: string }) {
  const { decrypt } = await import('../../services/encryption.service');
  const candidateAccounts = await db.instagramAccount.findMany({ 
    where: { 
      workspaceId,
      status: 'CONNECTED',
      encryptedToken: { not: null }
    } 
  });
  
  // Filter accounts that possess a real Instagram mobile/web session cookie.
  // Meta official OAuth tokens (IGAA...) cannot vote on Instagram Story polls.
  const accounts = candidateAccounts.filter(acc => {
    try {
      if (!acc.encryptedToken) return false;
      const dec = decrypt(acc.encryptedToken);
      return dec.startsWith('Bearer IGT:2:') || dec.includes('sessionid=') || (!dec.startsWith('IGAA') && !dec.startsWith('EAA') && dec.length > 20);
    } catch {
      return false;
    }
  });

  const chosenOption = data.selectedOption || data.optionId || 'Option A';

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

  if (accounts.length > 0) {
    await db.votingSessionAccount.createMany({
      data: accounts.map(acc => ({
        sessionId: session.id,
        accountId: acc.id,
        status: 'PENDING'
      }))
    });
  }

  return session;
}

export async function startSession(workspaceId: string, sessionId: string) {
  const session = await db.votingSession.findFirst({ where: { id: sessionId, workspaceId } });
  if (!session) throw new Error('Session not found');

  const { decrypt } = await import('../../services/encryption.service');
  let sessionAccounts = await db.votingSessionAccount.findMany({ where: { sessionId } });

  // If no accounts currently linked, or new accounts joined, refresh voting pool
  if (sessionAccounts.length === 0) {
    const candidateAccounts = await db.instagramAccount.findMany({ 
      where: { 
        workspaceId,
        status: 'CONNECTED',
        encryptedToken: { not: null }
      } 
    });
    
    const validAccounts = candidateAccounts.filter(acc => {
      try {
        if (!acc.encryptedToken) return false;
        const dec = decrypt(acc.encryptedToken);
        return dec.startsWith('Bearer IGT:2:') || dec.includes('sessionid=') || (!dec.startsWith('IGAA') && !dec.startsWith('EAA') && dec.length > 20);
      } catch {
        return false;
      }
    });

    if (validAccounts.length === 0) {
      throw new Error('No Instagram accounts with active voting sessions found. Please connect an account via Direct Login or Session ID in Accounts first.');
    }

    await db.votingSessionAccount.createMany({
      data: validAccounts.map(acc => ({
        sessionId: session.id,
        accountId: acc.id,
        status: 'PENDING'
      }))
    });

    await db.votingSession.update({
      where: { id: sessionId },
      data: { totalAccounts: validAccounts.length }
    });
  }

  await db.votingSession.update({ 
    where: { id: sessionId }, 
    data: { status: 'RUNNING', startedAt: new Date() } 
  });

  // Spawn worker
  processSessionAsync(workspaceId, sessionId).catch(console.error);
  
  return { success: true };
}

export async function restartSession(workspaceId: string, sessionId: string) {
  const session = await db.votingSession.findFirst({ where: { id: sessionId, workspaceId } });
  if (!session) throw new Error('Session not found');

  await db.votingSessionAccount.updateMany({
    where: { sessionId },
    data: { status: 'PENDING', error: null, completedAt: null, startedAt: null }
  });

  await db.votingSession.update({
    where: { id: sessionId },
    data: { status: 'DRAFT', completed: 0, failed: 0, completedAt: null, startedAt: null }
  });

  return { success: true };
}

export async function deleteSession(workspaceId: string, sessionId: string) {
  await db.votingSessionAccount.deleteMany({ where: { sessionId } }).catch(() => {});
  return db.votingSession.deleteMany({
    where: { id: sessionId, workspaceId }
  });
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

export async function listSessions(workspaceId: string, userId?: string) {
  return db.votingSession.findMany({
    where: {
      OR: [
        { workspaceId },
        ...(userId ? [{ createdById: userId }] : [])
      ]
    },
    include: { 
      poll: {
        include: {
          story: true
        }
      },
      sessionAccounts: {
        include: {
          account: true
        }
      }
    },
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
        let accountProxy = '';
        if (decrypted.startsWith('Bearer IGT:2:')) {
          try {
            const rawJson = Buffer.from(decrypted.replace('Bearer IGT:2:', ''), 'base64').toString('utf8');
            const parsed = JSON.parse(rawJson);
            sessionCookie = parsed.sessionid || '';
            accountProxy = parsed.proxy || '';
          } catch {}
        } else if (decrypted.includes('sessionid=')) {
          const m = decrypted.match(/sessionid=([^;]+)/);
          sessionCookie = m ? m[1] : decrypted;
        } else if (!decrypted.startsWith('IGAA') && !decrypted.startsWith('EAA')) {
          sessionCookie = decrypted;
        }

        const voterUid = sessionCookie.split('%3A')[0] || sessionCookie.split(':')[0] || '';

        // Prevent voting on own story gracefully without failing the session
        if (storyUserPk && voterUid === storyUserPk) {
          console.log(`[Sessions Service] Account @${accItem.account.username} is the story author. Marked successful (Instagram self-voting policy).`);
          voteSuccess = true;
          voteError = 'Self-voting: Account is story creator';
        } else if (sessionCookie && (mediaId || rawPk) && pollId) {
          const targetMedia = mediaId.split('_')[0] || rawPk || mediaId;
          console.log(`[Sessions Service] Sending real Instagram vote to media ${targetMedia}, poll ${pollId}, index ${voteIndex} for ${accItem.account.username}...`);

          const voteRes = await submitInstagramStoryVote({
            sessionId: sessionCookie,
            mediaId: targetMedia,
            pollId,
            voteIndex,
            authorPk: storyUserPk,
            proxy: accountProxy || undefined,
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
            } else if (voteRes.error?.includes('Rate Limit') || voteRes.data?.message?.includes('wait a few minutes')) {
              await db.instagramAccount.update({
                where: { id: accItem.account.id },
                data: {
                  status: 'CONNECTED',
                  statusMessage: 'Temporary Cooldown: Please wait 5-10 minutes.',
                  lastCheckedAt: new Date()
                }
              }).catch(() => {});
            }
          }
        } else {
          if (!sessionCookie && (decrypted.startsWith('IGAA') || decrypted.startsWith('EAA'))) {
            voteError = 'Official Meta OAuth tokens cannot vote on Instagram Stories. Please connect this account via Direct Login or Session ID.';
          } else if (!sessionCookie) {
            voteError = 'Missing Instagram session cookie. Please re-login this account via Direct Login.';
          } else {
            voteError = 'Missing story media ID or poll sticker details';
          }
          voteSuccess = false;
        }

        // Pacing delay between accounts to prevent action blocks (800ms - 1400ms)
        await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
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
