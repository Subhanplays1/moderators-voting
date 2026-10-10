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
  const client = new InstagramBloksClient(params.username, params.password);
  
  const result = await client.sendLoginRequest();

  if (result.status === 'SUCCESS' && result.authorizationToken) {
    const { encrypt } = await import('../../services/encryption.service');
    const encryptedToken = encrypt(result.authorizationToken);
    const cleanUsername = params.username.replace(/^@/, '').trim();

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
    const key = `${params.workspaceId}:${params.username.toLowerCase()}`;
    pendingClients.set(key, client);
    return {
      status: result.status,
      message: result.message,
      context: result.context
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
  const key = `${params.workspaceId}:${params.username.toLowerCase()}`;
  let client = pendingClients.get(key);

  if (!client) {
    client = new InstagramBloksClient(params.username);
  }

  const result = await client.verifyTwoFactorCode(params.code, params.context);

  if (result.status === 'SUCCESS' && result.authorizationToken) {
    pendingClients.delete(key);
    const { encrypt } = await import('../../services/encryption.service');
    const encryptedToken = encrypt(result.authorizationToken);
    const cleanUsername = params.username.replace(/^@/, '').trim();

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

export async function connectWithSessionId(params: {
  workspaceId: string;
  sessionId: string;
  addedById: string;
}) {
  const cleanSessionId = params.sessionId.trim();

  // Try retrieving user info from Instagram using sessionid cookie
  let username = '';
  let displayName = '';
  let profilePic = '';

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

  // Fallback check if private API didn't return username
  if (!username) {
    try {
      const webRes = await fetch('https://www.instagram.com/api/v1/users/web_profile_info/?username=instagram', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': `sessionid=${cleanSessionId};`,
          'X-IG-App-ID': '936619743392459',
          'Accept': '*/*',
        },
      });

      if (webRes.ok) {
        // Just checking cookie validity
      }
      // Extract user id from sessionid format (usually <user_id>%3A...)
      const userIdMatch = cleanSessionId.match(/^(\d+)%3A/) || cleanSessionId.match(/^(\d+):/);
      if (userIdMatch) {
        username = `user_${userIdMatch[1]}`;
      }
    } catch {}
  }

  // If sessionid format starts with user_id%3A
  if (!username) {
    const userIdMatch = cleanSessionId.match(/^(\d+)%3A/) || cleanSessionId.match(/^(\d+):/);
    if (userIdMatch) {
      username = `user_${userIdMatch[1]}`;
    } else {
      throw new Error('Invalid Instagram session ID format. The sessionid cookie typically looks like: 123456789%3A...');
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

