import { db } from '@moderators/database';
import { parse } from 'csv-parse/sync';
import { getInstagramProvider } from '../../providers/instagram';

export async function listAccounts(workspaceId: string) {
  return db.instagramAccount.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getAccount(workspaceId: string, id: string) {
  return db.instagramAccount.findFirst({
    where: { id, workspaceId }
  });
}

export async function createAccount(workspaceId: string, data: any, addedById: string) {
  const cleanUsername = data.username.replace(/^@/, '').trim();
  return db.instagramAccount.create({
    data: {
      workspaceId,
      username: cleanUsername,
      displayName: data.displayName || null,
      status: 'PENDING',
      addedById
    }
  });
}

export async function importAccounts(workspaceId: string, csvBuffer: Buffer, addedById: string) {
  const content = csvBuffer.toString();
  let usernames: string[] = [];

  // Try parsing CSV, otherwise split by newlines
  try {
    const records = parse(content, { columns: true, skip_empty_lines: true });
    usernames = records.map((r: any) => r.username || Object.values(r)[0]).filter(Boolean);
  } catch {
    usernames = content.split('\n').map(l => l.trim()).filter(Boolean);
  }

  let valid = 0;
  let duplicates = 0;
  let invalid = 0;

  for (const raw of usernames) {
    const username = String(raw).replace(/^@/, '').trim();
    if (!username || !/^[a-zA-Z0-9._]+$/.test(username)) {
      invalid++;
      continue;
    }

    const existing = await db.instagramAccount.findFirst({ where: { workspaceId, username } });
    if (existing) {
      duplicates++;
      continue;
    }

    await db.instagramAccount.create({
      data: {
        workspaceId,
        username,
        status: 'PENDING',
        addedById
      }
    });
    valid++;
  }

  return { total: usernames.length, valid, duplicates, invalid };
}

export async function connectAccount(workspaceId: string, id: string) {
  const account = await db.instagramAccount.findFirst({ where: { id, workspaceId } });
  if (!account) throw new Error('Account not found');
  
  const provider = getInstagramProvider();
  try {
    await provider.authenticate(id);
    return await db.instagramAccount.update({
      where: { id },
      data: { status: 'CONNECTED', lastCheckedAt: new Date(), statusMessage: 'Authorized successfully' }
    });
  } catch (err: any) {
    return await db.instagramAccount.update({
      where: { id },
      data: { status: 'ERROR', lastCheckedAt: new Date(), statusMessage: err.message || 'Authentication error' }
    });
  }
}

export async function disconnectAccount(workspaceId: string, id: string) {
  return db.instagramAccount.update({
    where: { id },
    data: { status: 'DISCONNECTED', lastCheckedAt: new Date() }
  });
}

export async function testConnection(workspaceId: string, id: string) {
  const provider = getInstagramProvider();
  const ok = await provider.testConnection(id);
  if (ok) {
    await db.instagramAccount.update({
      where: { id },
      data: { status: 'CONNECTED', lastCheckedAt: new Date() }
    });
  }
  return ok;
}

export async function removeAccount(workspaceId: string, id: string) {
  return db.instagramAccount.deleteMany({
    where: { id, workspaceId }
  });
}

export async function createOrUpdateOAuthAccount(params: {
  workspaceId: string;
  username: string;
  accessToken: string;
  addedById: string;
}) {
  const { encrypt } = await import('../../services/encryption.service');
  const encryptedToken = encrypt(params.accessToken);

  const existing = await db.instagramAccount.findFirst({
    where: { workspaceId: params.workspaceId, username: params.username }
  });

  if (existing) {
    return db.instagramAccount.update({
      where: { id: existing.id },
      data: {
        status: 'CONNECTED',
        encryptedToken,
        lastCheckedAt: new Date(),
        statusMessage: 'OAuth Authorized'
      }
    });
  }

  return db.instagramAccount.create({
    data: {
      workspaceId: params.workspaceId,
      username: params.username,
      status: 'CONNECTED',
      encryptedToken,
      addedById: params.addedById,
      lastCheckedAt: new Date(),
      statusMessage: 'OAuth Authorized'
    }
  });
}

// Global active client sessions cache for pending 2FA challenges
const pendingClients = new Map<string, any>();

export async function loginInstagramDirect(params: {
  workspaceId: string;
  username: string;
  password: string;
  addedById: string;
}) {
  const { InstagramBloksClient } = await import('../../providers/instagram/instagram-client');
  const cleanUsername = params.username.replace(/^@/, '').trim();
  const client = new InstagramBloksClient(cleanUsername, params.password);
  
  const result = await client.sendLoginRequest();

  if (result.status === 'SUCCESS' && result.authorizationToken) {
    const { encrypt } = await import('../../services/encryption.service');
    const encryptedToken = encrypt(result.authorizationToken);

    const existing = await db.instagramAccount.findFirst({
      where: { workspaceId: params.workspaceId, username: cleanUsername }
    });

    let account;
    if (existing) {
      account = await db.instagramAccount.update({
        where: { id: existing.id },
        data: {
          status: 'CONNECTED',
          encryptedToken,
          lastCheckedAt: new Date(),
          statusMessage: result.sessionId ? `Session active: ${result.sessionId.slice(0, 10)}...` : 'Session connected'
        }
      });
    } else {
      account = await db.instagramAccount.create({
        data: {
          workspaceId: params.workspaceId,
          username: cleanUsername,
          status: 'CONNECTED',
          encryptedToken,
          addedById: params.addedById,
          lastCheckedAt: new Date(),
          statusMessage: result.sessionId ? `Session active: ${result.sessionId.slice(0, 10)}...` : 'Session connected'
        }
      });
    }

    return { status: 'SUCCESS', account };
  }

  if (result.status === '2FA' || result.status === 'SECURE_CHALLENGE') {
    const key = `${params.workspaceId}:${cleanUsername.toLowerCase()}`;
    pendingClients.set(key, client);
    return {
      status: result.status,
      message: result.message,
      context: result.context || client.serializeState()
    };
  }

  return {
    status: result.status,
    message: result.message || 'Instagram authentication failed'
  };
}

export async function verifyInstagramTwoFactor(params: {
  workspaceId: string;
  username: string;
  code: string;
  context?: string;
  addedById: string;
}) {
  const { InstagramBloksClient } = await import('../../providers/instagram/instagram-client');
  const cleanUsername = params.username.replace(/^@/, '').trim();
  const key = `${params.workspaceId}:${cleanUsername.toLowerCase()}`;
  let client = pendingClients.get(key);

  if (!client && params.context) {
    client = InstagramBloksClient.deserializeState(params.context, cleanUsername);
  } else if (!client) {
    client = new InstagramBloksClient(cleanUsername);
  }

  const result = await client.verifyTwoFactorCode(params.code, params.context);

  if (result.status === 'SUCCESS' && result.authorizationToken) {
    pendingClients.delete(key);
    const { encrypt } = await import('../../services/encryption.service');
    const encryptedToken = encrypt(result.authorizationToken);

    const existing = await db.instagramAccount.findFirst({
      where: { workspaceId: params.workspaceId, username: cleanUsername }
    });

    let account;
    if (existing) {
      account = await db.instagramAccount.update({
        where: { id: existing.id },
        data: {
          status: 'CONNECTED',
          encryptedToken,
          lastCheckedAt: new Date(),
          statusMessage: result.sessionId ? `Session active: ${result.sessionId.slice(0, 10)}...` : 'Session connected'
        }
      });
    } else {
      account = await db.instagramAccount.create({
        data: {
          workspaceId: params.workspaceId,
          username: cleanUsername,
          status: 'CONNECTED',
          encryptedToken,
          addedById: params.addedById,
          lastCheckedAt: new Date(),
          statusMessage: result.sessionId ? `Session active: ${result.sessionId.slice(0, 10)}...` : 'Session connected'
        }
      });
    }

    return { status: 'SUCCESS', account };
  }

  return {
    status: result.status,
    message: result.message || 'Two-factor code verification failed'
  };
}

function extractCleanSessionId(raw: string): string {
  let cleaned = raw.trim().replace(/^["']|["']$/g, '');
  
  // 1. If full cookie string like "csrftoken=...; sessionid=...; ds_user_id=..."
  const cookieMatch = cleaned.match(/(?:^|;\s*)sessionid=([^;\s]+)/i);
  if (cookieMatch) {
    cleaned = cookieMatch[1].trim();
  } else if (cleaned.toLowerCase().startsWith('sessionid=')) {
    cleaned = cleaned.substring('sessionid='.length).trim();
  }

  // 2. Decode URL encoding if double-encoded
  if (cleaned.includes('%253A')) {
    cleaned = cleaned.replace(/%253A/g, '%3A');
  }

  // 3. If unencoded colon (12345:abc), normalize to standard Instagram cookie format (12345%3Aabc)
  if (/^\d+:/.test(cleaned)) {
    cleaned = cleaned.replace(/^(\d+):/, '$1%3A');
  }

  return cleaned.trim();
}

export async function connectWithSessionId(params: {
  workspaceId: string;
  sessionId: string;
  username?: string;
  addedById: string;
}) {
  const cleanSessionId = extractCleanSessionId(params.sessionId);

  if (!cleanSessionId || cleanSessionId.length < 5) {
    throw new Error('Invalid Instagram session ID format. Please paste the sessionid cookie value from instagram.com.');
  }

  // Try retrieving user info from Instagram using sessionid cookie
  let username = params.username?.replace(/^@/, '').trim() || '';
  let displayName = '';
  let profilePic = '';

  const userIdMatch = cleanSessionId.match(/^(\d+)%3A/) || cleanSessionId.match(/^(\d+):/);
  const detectedUserId = userIdMatch ? userIdMatch[1] : '';

  // 1. Try mobile private API accounts/current_user
  try {
    const res = await fetch('https://i.instagram.com/api/v1/accounts/current_user/?edit=true', {
      headers: {
        'User-Agent': 'Instagram 361.0.0.46.88 Android (28/9; 300dpi; 900x1600; Asus; ASUS_Z01QD; ASUS_Z01QD; intel; en_US; 674675155)',
        'Cookie': `sessionid=${cleanSessionId};`,
        'Accept': '*/*',
      },
    });

    if (res.ok) {
      const data: any = await res.json();
      if (data?.user?.username) {
        username = data.user.username;
        displayName = data.user.full_name || username;
        profilePic = data.user.profile_pic_url || '';
      }
    }
  } catch {}

  // 2. Try user info lookup via user ID
  if (!username && detectedUserId) {
    try {
      const infoRes = await fetch(`https://i.instagram.com/api/v1/users/${detectedUserId}/info/`, {
        headers: {
          'User-Agent': 'Instagram 361.0.0.46.88 Android (28/9; 300dpi; 900x1600; Asus; ASUS_Z01QD; ASUS_Z01QD; intel; en_US; 674675155)',
          'Cookie': `sessionid=${cleanSessionId};`,
          'Accept': '*/*',
        },
      });
      if (infoRes.ok) {
        const infoData: any = await infoRes.json();
        if (infoData?.user?.username) {
          username = infoData.user.username;
          displayName = infoData.user.full_name || username;
          profilePic = infoData.user.profile_pic_url || '';
        }
      }
    } catch {}
  }

  // 3. Fallback to detected user ID or timestamped label
  if (!username) {
    if (detectedUserId) {
      username = `user_${detectedUserId}`;
    } else {
      username = `ig_session_${Date.now().toString().slice(-6)}`;
    }
  }

  const { encrypt } = await import('../../services/encryption.service');
  const authToken = `Bearer IGT:2:${Buffer.from(JSON.stringify({ sessionid: cleanSessionId })).toString('base64')}`;
  const encryptedToken = encrypt(authToken);

  const existing = await db.instagramAccount.findFirst({
    where: { workspaceId: params.workspaceId, username }
  });

  let account;
  if (existing) {
    account = await db.instagramAccount.update({
      where: { id: existing.id },
      data: {
        status: 'CONNECTED',
        encryptedToken,
        displayName: displayName || undefined,
        profilePicture: profilePic || undefined,
        lastCheckedAt: new Date(),
        statusMessage: `Connected via Session (${cleanSessionId.slice(0, 10)}...)`
      }
    });
  } else {
    account = await db.instagramAccount.create({
      data: {
        workspaceId: params.workspaceId,
        username,
        displayName: displayName || username,
        profilePicture: profilePic || undefined,
        status: 'CONNECTED',
        encryptedToken,
        addedById: params.addedById,
        lastCheckedAt: new Date(),
        statusMessage: `Connected via Session (${cleanSessionId.slice(0, 10)}...)`
      }
    });
  }

  return { status: 'SUCCESS', account };
}

