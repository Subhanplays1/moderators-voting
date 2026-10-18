import axios, { type AxiosInstance } from 'axios';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export const BUILTIN_PROXY_POOL = [
  '45.38.107.97:6014:krxmmzcq:6mnj799j8ohl',
  '64.137.96.74:6641:krxmmzcq:6mnj799j8ohl',
  '198.23.243.226:6361:krxmmzcq:6mnj799j8ohl',
  '38.154.185.97:6370:krxmmzcq:6mnj799j8ohl',
  '84.247.60.125:6095:krxmmzcq:6mnj799j8ohl',
  '191.96.254.138:6185:krxmmzcq:6mnj799j8ohl',
  '198.46.161.42:5092:krxmmzcq:6mnj799j8ohl',
  '64.137.10.153:5803:krxmmzcq:6mnj799j8ohl',
  '104.164.49.38:7693:krxmmzcq:6mnj799j8ohl',
  '23.26.71.145:5628:krxmmzcq:6mnj799j8ohl',
];

export function normalizeSingleProxy(raw: string): string | undefined {
  let p = raw.trim();
  if (!p) return undefined;

  // Webshare backbone rotator (p.webshare.io) gives 407 error on basic accounts.
  // Auto-redirect to one of the 10 verified dedicated Webshare IPs!
  if (p.includes('p.webshare.io') || p.includes('webshare.io:80')) {
    const fallback = BUILTIN_PROXY_POOL[Math.floor(Math.random() * BUILTIN_PROXY_POOL.length)];
    return normalizeSingleProxy(fallback);
  }

  const parts = p.split(':');
  if (parts.length === 4 && !p.includes('://')) {
    const [host, port, user, pass] = parts;
    return `http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`;
  }

  if (parts.length === 2 && !p.includes('://')) {
    return `http://${p}`;
  }

  if (!p.startsWith('http://') && !p.startsWith('https://') && !p.startsWith('socks5://') && !p.startsWith('socks4://')) {
    return `http://${p}`;
  }

  return p;
}

export function normalizeProxyUrl(rawProxy?: string): string | undefined {
  let source = rawProxy || process.env.INSTAGRAM_PROXY || process.env.DEFAULT_PROXY;
  if (!source || source.trim() === '') {
    source = BUILTIN_PROXY_POOL[Math.floor(Math.random() * BUILTIN_PROXY_POOL.length)];
  }

  if (source.includes('p.webshare.io') || source.includes('webshare.io:80')) {
    source = BUILTIN_PROXY_POOL[Math.floor(Math.random() * BUILTIN_PROXY_POOL.length)];
  }

  const list = source.split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean);
  if (list.length === 0) return undefined;
  const picked = list.length === 1 ? list[0] : list[Math.floor(Math.random() * list.length)];
  return normalizeSingleProxy(picked);
}

export function createProxyAgent(rawProxy?: string) {
  const p = normalizeProxyUrl(rawProxy);
  if (!p) return undefined;
  try {
    if (p.startsWith('socks')) {
      return new SocksProxyAgent(p);
    }
    return new HttpsProxyAgent(p);
  } catch (err: any) {
    console.warn(`[Proxy Warning] Failed to initialize proxy agent for ${p}:`, err.message);
    return undefined;
  }
}

export function encryptInstagramWebPassword(keyId: string | number, pubKeyHex: string, password: string, version = '10'): string {
  try {
    const sealedbox = require('tweetnacl-sealedbox-js');
    const aesKey = crypto.randomBytes(32);
    const iv = Buffer.alloc(12, 0);
    const timestamp = Math.floor(Date.now() / 1000);
    const timestampStr = timestamp.toString();

    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    cipher.setAAD(Buffer.from(timestampStr, 'utf-8'));
    const encryptedPassword = Buffer.concat([
      cipher.update(password, 'utf-8'),
      cipher.final()
    ]);
    const cipherTag = cipher.getAuthTag();

    const pubKeyBytes = Buffer.from(pubKeyHex, 'hex');
    const encryptedKey = Buffer.from(sealedbox.seal(aesKey, pubKeyBytes));

    const lenBuffer = Buffer.alloc(2);
    lenBuffer.writeInt16LE(encryptedKey.length, 0);

    const payload = Buffer.concat([
      Buffer.from([1]),
      Buffer.from([Number(keyId)]),
      lenBuffer,
      encryptedKey,
      cipherTag,
      encryptedPassword
    ]);

    const b64 = payload.toString('base64');
    return `#PWD_INSTAGRAM_BROWSER:${version}:${timestamp}:${b64}`;
  } catch (err: any) {
    console.warn('[Instagram Encrypt Warning] Fallback encryption used:', err.message);
    const timestamp = Math.floor(Date.now() / 1000);
    return `#PWD_INSTAGRAM_BROWSER:0:${timestamp}:${password}`;
  }
}

export interface InstagramLoginResult {
  status: 'SUCCESS' | '2FA' | 'SECURE_CHALLENGE' | 'BAD_CREDENTIALS' | 'PENDING_APPROVAL' | 'ERROR';
  authorizationToken?: string;
  sessionId?: string;
  message?: string;
  context?: string;
  errorCode?: 'WRONG_PASSWORD' | 'USERNAME_NOT_FOUND' | 'RATE_LIMITED' | 'ACCOUNT_LOCKED' | 'INVALID_2FA_CODE' | 'CHECKPOINT_REQUIRED' | 'PENDING_APPROVAL' | 'UNKNOWN';
}

export class InstagramBloksClient {
  private username: string;
  private password: string;
  private baseUrl = 'https://i.instagram.com/api/v1/bloks/apps/';
  private baseDeviceId: string;
  private baseMachineId: string;
  private baseHeaderDeviceId: string;
  private baseHeaderFamilyDeviceId: string;
  private baseUserAgent = 'Instagram 361.0.0.46.88 Android (28/9; 300dpi; 900x1600; Asus; ASUS_Z01QD; ASUS_Z01QD; intel; en_US; 674675155)';
  private baseBlocksVersioningId = '16e9197b928710eafdf1e803935ed8c450a1a2e3eb696bff1184df088b900bcf';

  public http: AxiosInstance;
  public proxy?: string;
  public currentDataContext = '';
  public challengeType: '2FA' | 'SECURE_CHALLENGE' | 'NAV_CHALLENGE' | 'WEB_2FA' | 'MOBILE_2FA' | 'WEB_CHECKPOINT' = '2FA';
  public mobileTwoFactorIdentifier = '';
  public webTwoFactorIdentifier = '';
  public webCheckpointUrl = '';
  public webCookies: string[] = [];
  public currentHeaderMid = '';
  public currentChallengeUrl = '';

  constructor(username: string, password = '', restoredState?: any, proxy?: string) {
    this.username = username.replace(/^@/, '').trim();
    this.password = password;
    this.proxy = proxy || restoredState?.proxy || undefined;
    
    if (restoredState) {
      this.baseDeviceId = restoredState.baseDeviceId || 'android-ec40bd6622ac9b21';
      this.baseMachineId = restoredState.baseMachineId || 'Z5d97AABAAF0xC3_hhRHvlrYSyrM';
      this.baseHeaderDeviceId = restoredState.baseHeaderDeviceId || '552233dc-9663-4973-82bc-b00ad110137a';
      this.baseHeaderFamilyDeviceId = restoredState.baseHeaderFamilyDeviceId || 'd660a764-9ea5-4f2a-a358-ea3d5fa4bd8f';
      this.currentDataContext = restoredState.currentDataContext || '';
      this.challengeType = restoredState.challengeType || '2FA';
      this.mobileTwoFactorIdentifier = restoredState.mobileTwoFactorIdentifier || '';
      this.webTwoFactorIdentifier = restoredState.webTwoFactorIdentifier || '';
      this.webCheckpointUrl = restoredState.webCheckpointUrl || '';
      this.webCookies = Array.isArray(restoredState.webCookies) ? restoredState.webCookies : [];
      this.currentHeaderMid = restoredState.currentHeaderMid || '';
      this.currentChallengeUrl = restoredState.currentChallengeUrl || '';
    } else {
      // Deterministic, unique device footprint per username
      const cleanUser = this.username.toLowerCase();
      const hash = crypto.createHash('sha256').update(cleanUser).digest('hex');
      this.baseDeviceId = `android-${hash.slice(0, 16)}`;
      this.baseMachineId = Buffer.from(hash.slice(0, 20)).toString('base64').replace(/=/g, '');
      this.baseHeaderDeviceId = [
        hash.slice(0, 8),
        hash.slice(8, 12),
        '4' + hash.slice(13, 16),
        'a' + hash.slice(17, 20),
        hash.slice(20, 32)
      ].join('-');
      this.baseHeaderFamilyDeviceId = [
        hash.slice(32, 40),
        hash.slice(40, 44),
        '4' + hash.slice(45, 48),
        'b' + hash.slice(49, 52),
        hash.slice(52, 64)
      ].join('-');
    }

    const agent = createProxyAgent(this.proxy);
    this.http = axios.create({
      ...(agent ? { httpsAgent: agent, httpAgent: agent, proxy: false as const } : {}),
      validateStatus: () => true,
    });
  }

  public getAxiosAgentConfig() {
    const agent = createProxyAgent(this.proxy);
    return agent ? { httpsAgent: agent, httpAgent: agent, proxy: false as const } : {};
  }

  public serializeState(): string {
    return Buffer.from(JSON.stringify({
      username: this.username,
      proxy: this.proxy,
      baseDeviceId: this.baseDeviceId,
      baseMachineId: this.baseMachineId,
      baseHeaderDeviceId: this.baseHeaderDeviceId,
      baseHeaderFamilyDeviceId: this.baseHeaderFamilyDeviceId,
      currentDataContext: this.currentDataContext,
      challengeType: this.challengeType,
      mobileTwoFactorIdentifier: this.mobileTwoFactorIdentifier,
      webTwoFactorIdentifier: this.webTwoFactorIdentifier,
      webCheckpointUrl: this.webCheckpointUrl,
      webCookies: this.webCookies,
      currentHeaderMid: this.currentHeaderMid,
      currentChallengeUrl: this.currentChallengeUrl,
    })).toString('base64');
  }

  public static deserializeState(contextStr: string, username: string, password = '', proxy?: string): InstagramBloksClient {
    try {
      const parsed = JSON.parse(Buffer.from(contextStr, 'base64').toString('utf8'));
      return new InstagramBloksClient(username || parsed.username, password, parsed, proxy || parsed.proxy);
    } catch {
      const client = new InstagramBloksClient(username, password, undefined, proxy);
      client.currentDataContext = contextStr;
      return client;
    }
  }

  public formatCookieHeader(): string {
    const cookieMap = new Map<string, string>();
    for (const c of this.webCookies) {
      if (!c) continue;
      const part = c.split(';')[0];
      const eqIdx = part.indexOf('=');
      if (eqIdx > 0) {
        const k = part.substring(0, eqIdx).trim();
        const v = part.substring(eqIdx + 1).trim();
        cookieMap.set(k, v);
      }
    }
    return Array.from(cookieMap.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  public extractCsrfToken(): string {
    for (const c of this.webCookies) {
      const m = c.match(/csrftoken=([^;]+)/);
      if (m) return m[1];
    }
    const generated = crypto.randomBytes(16).toString('hex');
    this.webCookies.push(`csrftoken=${generated}; Path=/; Domain=.instagram.com`);
    return generated;
  }

  private getHeaders() {
    return {
      Host: 'i.instagram.com',
      'X-Ig-Device-Id': this.baseHeaderDeviceId,
      'X-Ig-Family-Device-Id': this.baseHeaderFamilyDeviceId,
      'X-Bloks-Version-Id': this.baseBlocksVersioningId,
      'User-Agent': this.baseUserAgent,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    };
  }

  private extractAuth(responseBody: string): { authToken?: string; sessionId?: string } {
    let authToken = '';
    let sessionId = '';

    const authMatch =
      responseBody.match(/IG-Set-Authorization\\*":\s*\\*"([^\\"]+)/i) ||
      responseBody.match(/IG-Set-Authorization":\s*"([^"]+)/i) ||
      responseBody.match(/Bearer\s+IGT:2:[A-Za-z0-9+/=_-]+/i);

    if (authMatch) {
      authToken = authMatch[1] || authMatch[0];
    }

    if (authToken && authToken.includes('Bearer IGT:2:')) {
      try {
        const encoded = authToken.split('Bearer IGT:2:')[1];
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const sessionMatch = decoded.match(/"sessionid":"([^"]+)"/);
        if (sessionMatch) {
          sessionId = sessionMatch[1];
        }
      } catch {}
    }

    return { authToken: authToken || undefined, sessionId: sessionId || undefined };
  }

  async sendLoginRequest(): Promise<InstagramLoginResult> {
    console.log(`[Instagram Login] Attempting multi-engine direct login for @${this.username} (Proxy: ${this.proxy || 'Default/Direct'})...`);

    // 1. Primary Engine: Official Instagram Web AJAX Login
    const webResult = await this.tryWebLoginFallback();
    if (webResult.status === 'SUCCESS' || webResult.status === '2FA' || webResult.status === 'SECURE_CHALLENGE') {
      return webResult;
    }

    // 2. Secondary Engine: Classic Instagram Mobile Signed Android API (masslooker standard)
    console.log(`[Instagram Login] Web login returned ${webResult.status} (${webResult.message}). Trying Classic Signed Mobile API...`);
    const classicResult = await this.sendClassicSignedLogin();
    if (classicResult.status === 'SUCCESS' || classicResult.status === '2FA' || classicResult.status === 'SECURE_CHALLENGE') {
      return classicResult;
    }

    // 3. Tertiary Engine: Mobile Bloks CAA Login
    console.log(`[Instagram Login] Classic login returned ${classicResult.status}. Trying Mobile Bloks CAA fallback...`);
    const bloksResult = await this.sendMobileBloksLogin();
    if (bloksResult.status === 'SUCCESS' || bloksResult.status === '2FA' || bloksResult.status === 'SECURE_CHALLENGE') {
      return bloksResult;
    }

    // Return the clearest error response
    if (classicResult.status === 'BAD_CREDENTIALS') return classicResult;
    if (webResult.status === 'BAD_CREDENTIALS') return webResult;
    return bloksResult;
  }

  /**
   * Engine 2: Classic Instagram Mobile Signed API Login (Android private API standard)
   */
  async sendClassicSignedLogin(): Promise<InstagramLoginResult> {
    const IG_SIG_KEY = '19ce5f445dbfd9d29c59dc2a78c616a7fc090a8e018b9267bc4240a30244c53b';
    const timestamp = Math.floor(Date.now() / 1000);

    try {
      const payload = {
        country_codes: '[{"country_code":"1","source":["default"]}]',
        phone_id: this.baseHeaderDeviceId,
        device_id: this.baseDeviceId,
        guid: this.baseHeaderDeviceId,
        username: this.username,
        password: this.password,
        enc_password: `#PWD_INSTAGRAM:0:${timestamp}:${this.password}`,
        login_attempt_count: '0',
      };
      const jsonPayload = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', IG_SIG_KEY).update(jsonPayload).digest('hex');
      const postBody = `ig_sig_key_version=4&signed_body=${signature}.${encodeURIComponent(jsonPayload)}`;

      const res = await this.http.post('https://i.instagram.com/api/v1/accounts/login/', postBody, {
        headers: {
          'User-Agent': this.baseUserAgent,
          'Accept-Language': 'en-US',
          'X-IG-Connection-Type': 'WIFI',
          'X-IG-Capabilities': '36r/Fx8=',
          'X-IG-App-ID': '936619743392459',
          'Cookie': this.formatCookieHeader(),
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        ...this.getAxiosAgentConfig(),
        validateStatus: () => true,
      });

      const setCookies = res.headers['set-cookie'] || [];
      if (Array.isArray(setCookies)) {
        this.webCookies.push(...setCookies);
      }

      let foundSessionId = '';
      for (const c of this.webCookies) {
        const m = c.match(/sessionid=([^;]+)/);
        if (m) foundSessionId = m[1];
      }

      const authHeader = (res.headers['ig-set-authorization'] as string) || '';

      if (res.data?.status === 'ok' && (foundSessionId || res.data?.logged_in_user || authHeader)) {
        const authTok = authHeader || `Bearer IGT:2:${Buffer.from(JSON.stringify({ 
          sessionid: foundSessionId,
          user: res.data?.logged_in_user,
          proxy: this.proxy,
        })).toString('base64')}`;
        return {
          status: 'SUCCESS',
          authorizationToken: authTok,
          sessionId: foundSessionId,
        };
      }

      // Check for 2FA
      if (res.data?.two_factor_required) {
        const twoFactorInfo = res.data.two_factor_info;
        this.mobileTwoFactorIdentifier = twoFactorInfo?.two_factor_identifier || '';
        this.currentDataContext = this.mobileTwoFactorIdentifier;
        this.challengeType = 'MOBILE_2FA';
        return {
          status: '2FA',
          context: this.serializeState(),
          message: 'Two-Factor verification required. Enter the 6-digit code sent to your Authenticator App or SMS.',
        };
      }

      // Check for Checkpoint
      if (res.data?.message === 'checkpoint_required' || res.data?.checkpoint_url) {
        this.currentChallengeUrl = res.data?.checkpoint_url || '';
        this.challengeType = 'SECURE_CHALLENGE';
        return {
          status: 'SECURE_CHALLENGE',
          context: this.serializeState(),
          message: 'Instagram security verification checkpoint triggered. Enter code from your phone/email.',
        };
      }

      // Explicit bad password
      if (res.data?.error_type === 'bad_password' || res.data?.message?.toLowerCase().includes('password')) {
        return {
          status: 'BAD_CREDENTIALS',
          errorCode: 'WRONG_PASSWORD',
          message: 'The password you entered is incorrect. Please try again.',
        };
      }

      if (res.data?.message?.toLowerCase().includes('wait a few minutes')) {
        return {
          status: 'ERROR',
          errorCode: 'RATE_LIMITED',
          message: 'Instagram rate limit: Please wait a few minutes before trying again.',
        };
      }
    } catch (err: any) {
      console.warn(`[Instagram Classic Login Warning]: ${err.message}`);
    }

    return {
      status: 'ERROR',
      message: 'Classic signed login attempt bypassed.',
    };
  }

  /**
   * Primary: Authentic Instagram Web AJAX Login (Official browser endpoint)
   */
  async tryWebLoginFallback(): Promise<InstagramLoginResult> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const initialRes = await this.http.get('https://www.instagram.com/accounts/login/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        ...this.getAxiosAgentConfig(),
        maxRedirects: 5,
        validateStatus: () => true,
      });

      const initialCookies = initialRes.headers['set-cookie'] || [];
      this.webCookies = [...initialCookies];
      let csrfToken = this.extractCsrfToken();

      if (!csrfToken && typeof initialRes.data === 'string') {
        const match = initialRes.data.match(/"csrf_token":"([^"]+)"/);
        if (match) {
          csrfToken = match[1];
          this.webCookies.push(`csrftoken=${csrfToken}; Domain=.instagram.com; Path=/`);
        }
      }

      let keyId = (initialRes.headers['ig-set-password-encryption-web-key-id'] as string) || '220';
      let pubKey = (initialRes.headers['ig-set-password-encryption-web-pub-key'] as string) || '';
      let keyVersion = (initialRes.headers['ig-set-password-encryption-web-key-version'] as string) || '10';

      if (!pubKey && typeof initialRes.data === 'string') {
        const kidMatch = initialRes.data.match(/"key_id":\s*"?([^",}]+)/);
        if (kidMatch) keyId = kidMatch[1];
        const pkeyMatch = initialRes.data.match(/"public_key":\s*"([^"]+)/);
        if (pkeyMatch) pubKey = pkeyMatch[1];
        const verMatch = initialRes.data.match(/"version":\s*"?([^",}]+)/);
        if (verMatch) keyVersion = verMatch[1];
      }

      if (!pubKey) {
        pubKey = '28a6053a29195caf329547d258f415d94af5f1e6861852ee6294f66b97374908';
      }

      const encPassword = encryptInstagramWebPassword(keyId, pubKey, this.password, keyVersion);

      const postData = new URLSearchParams({
        enc_password: encPassword,
        optIntoOneTap: 'false',
        queryParams: '{}',
        trustedDeviceRecords: '{}',
        username: this.username,
      });

      const loginRes = await this.http.post('https://www.instagram.com/api/v1/web/accounts/login/ajax/', postData.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'X-CSRFToken': csrfToken,
          'X-IG-App-ID': '936619743392459',
          'X-ASBD-ID': '129477',
          'X-IG-WWW-Claim': '0',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://www.instagram.com/accounts/login/',
          'Origin': 'https://www.instagram.com',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.formatCookieHeader(),
        },
        ...this.getAxiosAgentConfig(),
        validateStatus: () => true,
      });

      const loginCookies = loginRes.headers['set-cookie'] || [];
      this.webCookies.push(...loginCookies);

      let foundSessionId = '';
      for (const c of this.webCookies) {
        const m = c.match(/sessionid=([^;]+)/);
        if (m) foundSessionId = m[1];
      }

      // 1. Success check: session ID found or authenticated
      if (foundSessionId || loginRes.data?.authenticated) {
        const authTok = `Bearer IGT:2:${Buffer.from(JSON.stringify({ 
          sessionid: foundSessionId,
          userId: loginRes.data?.userId 
        })).toString('base64')}`;
        return {
          status: 'SUCCESS',
          authorizationToken: authTok,
          sessionId: foundSessionId,
        };
      }

      // 2. 2FA Verification Required (Authenticator App or SMS)
      if (loginRes.data?.two_factor_required) {
        const twoFactorInfo = loginRes.data.two_factor_info;
        this.webTwoFactorIdentifier = twoFactorInfo?.two_factor_identifier || '';
        this.currentDataContext = this.webTwoFactorIdentifier;
        this.challengeType = 'WEB_2FA';
        const contactHint = twoFactorInfo?.obfuscated_phone_number
          ? `SMS (${twoFactorInfo.obfuscated_phone_number})`
          : (twoFactorInfo?.totp_two_factor_on ? 'Authenticator App' : 'Authenticator App or SMS');
        return {
          status: '2FA',
          context: this.serializeState(),
          message: `Two-Factor verification required. Enter the 6-digit code sent to your ${contactHint}.`,
        };
      }

      // 3. Web Checkpoint required (Email or Phone security verification)
      if (loginRes.data?.message === 'checkpoint_required' || loginRes.data?.checkpoint_url) {
        let cpUrl = loginRes.data.checkpoint_url || '';
        if (cpUrl && !cpUrl.startsWith('http')) {
          cpUrl = `https://www.instagram.com${cpUrl}`;
        }
        this.webCheckpointUrl = cpUrl;
        this.currentDataContext = this.webCheckpointUrl;
        this.challengeType = 'WEB_CHECKPOINT';

        console.log(`[Instagram Web Login] Checkpoint encountered: ${this.webCheckpointUrl}`);

        try {
          const challengePageRes = await this.http.get(this.webCheckpointUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
              'Cookie': this.formatCookieHeader(),
              'X-Requested-With': 'XMLHttpRequest',
              'Referer': 'https://www.instagram.com/accounts/login/',
              'Accept': 'application/json, text/html, */*',
            },
            validateStatus: () => true,
          });

          if (challengePageRes.headers['set-cookie']) {
            this.webCookies.push(...challengePageRes.headers['set-cookie']);
          }

          const stepData = challengePageRes.data?.step_data || {};
          let contactMethod = '';
          if (stepData.email) {
            contactMethod = `Email (${stepData.email})`;
          } else if (stepData.phone_number) {
            contactMethod = `Phone (${stepData.phone_number})`;
          }

          if (challengePageRes.data?.step_name === 'select_verify_method' || challengePageRes.data?.fields?.choice !== undefined) {
            const choice = stepData.email ? '1' : '0';
            console.log(`[Instagram Checkpoint] Auto-selecting verification method choice=${choice}...`);
            const choicePost = new URLSearchParams({ choice });
            const dispatchRes = await this.http.post(this.webCheckpointUrl, choicePost.toString(), {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Cookie': this.formatCookieHeader(),
                'X-CSRFToken': this.extractCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': this.webCheckpointUrl,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              validateStatus: () => true,
            });

            if (dispatchRes.headers['set-cookie']) {
              this.webCookies.push(...dispatchRes.headers['set-cookie']);
            }
          }

          return {
            status: 'SECURE_CHALLENGE',
            context: this.serializeState(),
            message: contactMethod
              ? `Instagram security verification required. Code sent to ${contactMethod}. Enter the 6-digit code below.`
              : 'Instagram security verification required. Code sent to your Email or Phone. Enter the 6-digit code below.',
          };
        } catch (cpErr: any) {
          console.error('[Instagram Checkpoint Error]:', cpErr.message);
          return {
            status: 'SECURE_CHALLENGE',
            context: this.serializeState(),
            message: 'Instagram security verification required. Enter the 6-digit verification code below.',
          };
        }
      }

      // 4. Incorrect Password
      if (loginRes.data?.user === true && !loginRes.data?.authenticated) {
        return {
          status: 'BAD_CREDENTIALS',
          errorCode: 'WRONG_PASSWORD',
          message: 'The password you entered is incorrect. Please try again.',
        };
      }

      // 5. Account Doesn't Exist
      if (loginRes.data?.user === false) {
        return {
          status: 'BAD_CREDENTIALS',
          errorCode: 'USERNAME_NOT_FOUND',
          message: "The username you entered doesn't appear to belong to an account. Please check your username.",
        };
      }

      // 6. Rate Limit
      if (loginRes.data?.message?.toLowerCase().includes('wait a few minutes') || loginRes.data?.message?.toLowerCase().includes('too many requests')) {
        return {
          status: 'ERROR',
          errorCode: 'RATE_LIMITED',
          message: 'Please wait a few minutes before trying again (Instagram rate limit).',
        };
      }

      // 7. Account Locked or Disabled
      if (loginRes.data?.message?.toLowerCase().includes('locked') || loginRes.data?.message?.toLowerCase().includes('disabled')) {
        return {
          status: 'BAD_CREDENTIALS',
          errorCode: 'ACCOUNT_LOCKED',
          message: 'Your Instagram account has been locked or disabled by Instagram.',
        };
      }

      // 8. Any Other Instagram API Error Message
      if (loginRes.data?.message) {
        let code: 'WRONG_PASSWORD' | 'RATE_LIMITED' | 'ACCOUNT_LOCKED' | 'UNKNOWN' = 'UNKNOWN';
        const msg = loginRes.data.message.toLowerCase();
        if (msg.includes('password') || msg.includes('incorrect')) code = 'WRONG_PASSWORD';
        else if (msg.includes('rate') || msg.includes('wait') || msg.includes('limit')) code = 'RATE_LIMITED';
        else if (msg.includes('lock') || msg.includes('suspend')) code = 'ACCOUNT_LOCKED';
        return {
          status: 'ERROR',
          errorCode: code,
          message: loginRes.data.message,
        };
      }
    } catch (err: any) {
      console.error('[Instagram Web Fallback Error]:', err.message);
      return {
        status: 'ERROR',
        errorCode: 'UNKNOWN',
        message: err.message || 'Network error connecting to Instagram.',
      };
    }

    return {
      status: 'BAD_CREDENTIALS',
      errorCode: 'WRONG_PASSWORD',
      message: 'Failed to authenticate with Instagram. Please check your username and password.',
    };
  }

  /**
   * Secondary Fallback: Mobile Bloks CAA Login Flow
   */
  async sendMobileBloksLogin(): Promise<InstagramLoginResult> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const waterfallId = crypto.randomUUID();

      const postData = new URLSearchParams();
      postData.append(
        'params',
        JSON.stringify({
          client_input_params: {
            should_show_nested_nta_from_aymh: 0,
            device_id: this.baseDeviceId,
            sim_phones: [],
            login_attempt_count: 1,
            secure_family_device_id: '',
            machine_id: this.baseMachineId,
            accounts_list: [{ credential_type: 'google_oauth', account_type: 'google_oauth', token: '' }],
            auth_secure_device_id: '',
            has_whatsapp_installed: 0,
            password: `#PWD_INSTAGRAM:0:${timestamp}:${encodeURIComponent(this.password)}`,
            sso_token_map_json_string: '',
            family_device_id: this.baseHeaderFamilyDeviceId,
            fb_ig_device_id: [],
            device_emails: [],
            try_num: 1,
            lois_settings: { lois_token: '', lara_override: '' },
            event_flow: 'login_manual',
            event_step: 'home_page',
            headers_infra_flow_id: '',
            openid_tokens: { '': '' },
            client_known_key_hash: '',
            contact_point: this.username,
            encrypted_msisdn: '',
          },
          server_params: {
            should_trigger_override_login_2fa_action: 0,
            is_from_logged_out: 0,
            should_trigger_override_login_success_action: 0,
            login_credential_type: 'none',
            server_login_source: 'login',
            waterfall_id: waterfallId,
            login_source: 'Login',
            is_platform_login: 0,
            INTERNAL__latency_qpl_marker_id: 36707139,
            offline_experiment_group: 'caa_iteration_v3_perf_ig_4',
            is_from_landing_page: 0,
            password_text_input_id: 'e5bwah:133',
            is_from_empty_password: 0,
            ar_event_source: 'login_home_page',
            qe_device_id: this.baseHeaderDeviceId,
            username_text_input_id: 'e5bwah:132',
            layered_homepage_experiment_group: null,
            device_id: this.baseDeviceId,
            INTERNAL__latency_qpl_instance_id: 8.5547960900377e13,
            reg_flow_source: 'login_home_native_integration_point',
            is_caa_perf_enabled: 1,
            credential_type: 'password',
            is_from_password_entry_page: 0,
          },
        })
      );
      postData.append('bloks_versioning_id', this.baseBlocksVersioningId);

      const res = await this.http.post(
        `${this.baseUrl}com.bloks.www.bloks.caa.login.async.send_login_request/`,
        postData.toString(),
        {
          headers: this.getHeaders(),
          maxRedirects: 0,
          validateStatus: () => true,
        }
      );

      if (res.headers['ig-set-x-mid']) {
        this.currentHeaderMid = res.headers['ig-set-x-mid'] as string;
      }

      const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      console.log(`[Instagram Bloks Login] Response status: ${res.status}, snippet: ${body.slice(0, 300)}`);

      // 1. Success check: Authorization token present
      if (body.includes('IG-Set-Authorization') || body.includes('logged_in_user')) {
        const { authToken, sessionId } = this.extractAuth(body);
        return {
          status: 'SUCCESS',
          authorizationToken: authToken,
          sessionId,
        };
      }

      // 2. Navigation Challenge (xr0ni take_challenge flow)
      if (body.includes('challenge_context') && (body.includes('override_login_2fa_action') || body.includes('navigation.take_challenge') || body.includes('/challenge/'))) {
        const urlPattern = /\\"url\\":\\"(.*?)\\",\\"api_path/;
        const contextPattern = /\\"challenge_context\\":\\"(.*?)\\"\}\}\\",\s*\(bk\.action\./;
        const urlMatch = body.match(urlPattern);
        const contextMatch = body.match(contextPattern) || body.match(/"challenge_context":"([^"]+)"/);

        if (contextMatch) {
          this.currentDataContext = contextMatch[1];
          if (urlMatch) {
            this.currentChallengeUrl = urlMatch[1].replace(/\\/g, '');
          }
          this.challengeType = 'NAV_CHALLENGE';

          console.log('[Instagram Login] Navigation Challenge detected. Initializing take_challenge...');
          const challengeInit = await this.initiateNavigationChallenge();
          if (challengeInit.success) {
            return {
              status: 'SECURE_CHALLENGE',
              context: this.serializeState(),
              message: challengeInit.contactPoint
                ? `Security verification required. Code dispatched by Instagram to ${challengeInit.contactPoint}.`
                : 'Security verification required. Instagram sent a verification code to your email or phone.',
            };
          }
        }
      }

      // 3. Two-Factor Authentication (Authenticator app TOTP or SMS in Bloks)
      if (body.includes('redirection_to_two_fac') || body.includes('override_login_2fa_action') || body.includes('two_factor_login')) {
        const match =
          body.match(/\\"INTERNAL_INFRA_screen_id\\"\).*?Make,\s*\\"(.*?)\\",\s*\\"two_factor_login\\"/) ||
          body.match(/\\"INTERNAL_INFRA_THEME\\"\).*?Make,\s*\\"(.*?)\\",\s*\\"two_factor_login\\"/) ||
          body.match(/\\"INTERNAL_INFRA_THEME\\".*?Make,\s*\\"(.*?)\\",\s*\\"harm_f/);
        if (match) {
          this.currentDataContext = match[1];
          this.challengeType = '2FA';
          return {
            status: '2FA',
            context: this.serializeState(),
            message: 'Two-Factor Authentication required. Enter the 6-digit code from your Authenticator app.',
          };
        }
      }

      // 4. Secure Challenge (SMS/Email security code checkpoint in Bloks)
      if (body.includes('two_step_verification')) {
        const match = body.match(/\\"device_id\\".*?Make,\s*\\"(.*?)\\",\s*\\"/);
        if (match) {
          this.currentDataContext = match[1];
          this.challengeType = 'SECURE_CHALLENGE';

          console.log('[Instagram Login] Checkpoint detected. Requesting security code dispatch from Instagram...');
          const secureRes = await this.sendSecureCodeRequest();
          if (secureRes.success) {
            return {
              status: 'SECURE_CHALLENGE',
              context: this.serializeState(),
              message: secureRes.contactPoint
                ? `Security code sent by Instagram to ${secureRes.contactPoint}.`
                : 'Security code dispatched to your phone or email.',
            };
          }
        }
      }

      // 5. Explicit incorrect password dialog check
      const explicitBadCredentials = [
        'The password you entered is incorrect',
        'Incorrect password',
        'wrong password',
        "The username you entered doesn't appear to belong to an account",
        'Your account has been locked',
        'Your account has been disabled',
      ];

      for (const kw of explicitBadCredentials) {
        if (body.includes(kw)) {
          let msg = 'The password you entered is incorrect. Please try again.';
          if (kw.includes('locked') || kw.includes('disabled')) {
            msg = 'Your Instagram account has been locked or disabled by Instagram.';
          } else if (kw.includes("doesn't appear to belong")) {
            msg = "The username you entered doesn't appear to belong to an account. Please check your username.";
          }
          return {
            status: 'BAD_CREDENTIALS',
            message: msg,
          };
        }
      }
    } catch (err: any) {
      console.warn('[Instagram Bloks Login Error]:', err.message);
    }

    return {
      status: 'ERROR',
      message: 'Mobile Bloks authentication failed.',
    };
  }

  /**
   * Dispatches the 2-step verification security code to the user's phone/email via Bloks
   */
  async sendSecureCodeRequest(): Promise<{ success: boolean; contactPoint?: string; message?: string }> {
    try {
      const postData1 = new URLSearchParams();
      postData1.append(
        'params',
        JSON.stringify({
          client_input_params: {
            auth_secure_device_id: '',
            has_whatsapp_installed: 0,
            machine_id: this.baseMachineId,
            family_device_id: this.baseHeaderFamilyDeviceId,
          },
          server_params: {
            context_data: this.currentDataContext,
            INTERNAL__latency_qpl_marker_id: 36707139,
            INTERNAL__latency_qpl_instance_id: 1.12364533900003e14,
            device_id: this.baseHeaderDeviceId,
          },
        })
      );
      postData1.append(
        'bk_client_context',
        JSON.stringify({
          bloks_version: this.baseBlocksVersioningId,
          styles_id: 'instagram',
        })
      );
      postData1.append('bloks_versioning_id', this.baseBlocksVersioningId);

      const res1 = await this.http.post(
        `${this.baseUrl}com.bloks.www.ap.two_step_verification.entrypoint_async/`,
        postData1.toString(),
        {
          headers: this.getHeaders(),
          maxRedirects: 0,
          validateStatus: () => true,
        }
      );

      const body1 = typeof res1.data === 'string' ? res1.data : JSON.stringify(res1.data);

      if (!body1.includes('two_step_verification.code_entry')) {
        console.log('[Instagram SecureCode] Entrypoint response did not contain code_entry:', body1.slice(0, 300));
        return { success: false, message: 'Could not initialize code entry screen' };
      }

      const match1 = body1.match(/\\"device_id\\".*?Make,\s*\\"(.*?)\\",\s*\\"/);
      if (match1) {
        this.currentDataContext = match1[1];
      } else {
        return { success: false, message: 'Could not extract context for code entry' };
      }

      const postData2 = new URLSearchParams();
      postData2.append(
        'params',
        JSON.stringify({
          server_params: {
            device_id: this.baseHeaderDeviceId,
            context_data: this.currentDataContext,
            INTERNAL_INFRA_screen_id: 'generic_code_entry',
          },
        })
      );
      postData2.append('bloks_versioning_id', this.baseBlocksVersioningId);

      const res2 = await this.http.post(
        `${this.baseUrl}com.bloks.www.ap.two_step_verification.code_entry/`,
        postData2.toString(),
        {
          headers: this.getHeaders(),
          maxRedirects: 0,
          validateStatus: () => true,
        }
      );

      const body2 = typeof res2.data === 'string' ? res2.data : JSON.stringify(res2.data);

      if (body2.includes('the code we sent')) {
        const contactMatch = body2.match(/Enter the code we sent to ([^"]+)/i);
        const match2 = body2.match(/\\"device_id\\".*?Make,\s*\\"(.*?)\\",\s*\\"/);
        if (match2) {
          this.currentDataContext = match2[1];
        }
        const contactPoint = contactMatch ? contactMatch[1] : undefined;
        console.log(`[Instagram SecureCode] Security code dispatched to: ${contactPoint}`);
        return {
          success: true,
          contactPoint,
        };
      }

      return { success: false, message: 'Failed to request verification code from Instagram' };
    } catch (err: any) {
      console.error('[Instagram SecureCode] Exception:', err);
      return { success: false, message: err.message || 'Error triggering security code' };
    }
  }

  /**
   * Verifies an SMS/Email secure code (checkpoint flow)
   */
  async enterSecureCodeRequest(code: string, context?: string): Promise<InstagramLoginResult> {
    const ctx = context || this.currentDataContext;
    const postData = new URLSearchParams();
    postData.append(
      'params',
      JSON.stringify({
        client_input_params: {
          auth_secure_device_id: '',
          machine_id: this.baseMachineId,
          code,
          family_device_id: this.baseHeaderFamilyDeviceId,
          device_id: this.baseDeviceId,
        },
        server_params: {
          context_data: ctx,
          INTERNAL__latency_qpl_marker_id: 36707139,
          INTERNAL__latency_qpl_instance_id: 1.44172662300254e14,
          device_id: this.baseHeaderDeviceId,
        },
      })
    );
    postData.append(
      'bk_client_context',
      JSON.stringify({
        bloks_version: this.baseBlocksVersioningId,
        styles_id: 'instagram',
      })
    );
    postData.append('bloks_versioning_id', this.baseBlocksVersioningId);

    const res = await this.http.post(
      `${this.baseUrl}com.bloks.www.ap.two_step_verification.code_entry_async/`,
      postData.toString(),
      {
        headers: this.getHeaders(),
        maxRedirects: 0,
        validateStatus: () => true,
      }
    );

    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    console.log(`[Instagram SecureCode Verify] Response status: ${res.status}, snippet: ${body.slice(0, 300)}`);

    if (body.includes('IG-Set-Authorization') || body.includes('logged_in_user')) {
      const { authToken, sessionId } = this.extractAuth(body);
      return {
        status: 'SUCCESS',
        authorizationToken: authToken,
        sessionId,
      };
    }

    if (body.includes('code validation') || body.includes('security code and try again')) {
      return { status: 'BAD_CREDENTIALS', message: 'Invalid verification code entered' };
    }

    return { status: 'ERROR', message: 'Verification failed' };
  }

  /**
   * Initiates Instagram Bloks navigation challenge (xr0ni flow)
   */
  async initiateNavigationChallenge(): Promise<{ success: boolean; contactPoint?: string }> {
    try {
      let targetUrl = this.currentChallengeUrl;
      if (targetUrl) {
        targetUrl = targetUrl.replace('https://i.instagram.com/challenge/', 'https://i.instagram.com/api/v1/challenge/');
        const headers = {
          ...this.getHeaders(),
          'X-Mid': this.currentHeaderMid || '',
        };

        const res = await this.http.get(`${targetUrl}?guid=${this.baseHeaderDeviceId}&device_id=${this.baseDeviceId}&challenge_context=${this.currentDataContext}`, {
          headers,
          validateStatus: () => true,
        });

        const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        const contextMatch = body.match(/"challenge_context":"(.*?)"/);
        if (contextMatch) {
          this.currentDataContext = contextMatch[1];
        }
      }

      // Dispatch verification code via take_challenge
      const payload = new URLSearchParams({
        choice: '1', // 1=Email, 0=SMS
        has_follow_up_screens: '0',
        bk_client_context: JSON.stringify({ bloks_version: this.baseBlocksVersioningId, styles_id: 'instagram' }),
        challenge_context: this.currentDataContext,
        bloks_versioning_id: this.baseBlocksVersioningId,
      });

      const dispatchRes = await this.http.post(`${this.baseUrl}com.instagram.challenge.navigation.take_challenge/`, payload.toString(), {
        headers: {
          ...this.getHeaders(),
          'X-Mid': this.currentHeaderMid || '',
        },
        validateStatus: () => true,
      });

      const dispatchBody = typeof dispatchRes.data === 'string' ? dispatchRes.data : JSON.stringify(dispatchRes.data);
      const contactMatch = dispatchBody.match(/Enter the (?:6-digit )?code we sent to (.*?)[",\\]/i) || dispatchBody.match(/sent to (.*?\*\*\*.*?)[",\\]/i);
      const contactPoint = contactMatch ? contactMatch[1].trim() : undefined;

      return { success: true, contactPoint };
    } catch (e: any) {
      console.error('[Instagram Navigation Challenge Init Error]:', e);
      return { success: false };
    }
  }

  /**
   * Submits security verification code for Bloks navigation challenge
   */
  async enterNavigationChallengeCode(code: string): Promise<InstagramLoginResult> {
    try {
      const payload = new URLSearchParams({
        security_code: code.trim(),
        perf_logging_id: '1456832077',
        has_follow_up_screens: '0',
        bk_client_context: JSON.stringify({ bloks_version: this.baseBlocksVersioningId, styles_id: 'instagram' }),
        challenge_context: this.currentDataContext,
        bloks_versioning_id: this.baseBlocksVersioningId,
      });

      const res = await this.http.post(`${this.baseUrl}com.instagram.challenge.navigation.take_challenge/`, payload.toString(), {
        headers: {
          ...this.getHeaders(),
          'X-Mid': this.currentHeaderMid || '',
        },
        validateStatus: () => true,
      });

      const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const authHeader = (res.headers['ig-set-authorization'] as string) || '';

      if (authHeader || body.includes('profile_pic_url') || body.includes('fbid_v2') || body.includes('logged_in_user')) {
        const { authToken, sessionId } = this.extractAuth(body);
        const finalToken = authHeader || authToken;
        return {
          status: 'SUCCESS',
          authorizationToken: finalToken,
          sessionId,
        };
      }

      if (body.includes('check the code we sent') || body.includes('invalid') || body.includes('security_code')) {
        return { status: 'BAD_CREDENTIALS', message: 'Invalid verification code. Please check your SMS/Email.' };
      }

      return { status: 'ERROR', message: 'Verification failed. Please check code or connect via Session Cookie.' };
    } catch (e: any) {
      console.error('[Instagram Navigation Challenge Code Error]:', e);
      return { status: 'ERROR', message: e.message || 'Error submitting challenge code' };
    }
  }

  /**
   * Verifies standard TOTP 2FA code or falls back to secure code
   */
  /**
   * Verifies 2FA via Mobile Android Private API (accounts/two_factor_login/)
   */
  async verifyMobileTwoFactor(code: string, identifier: string): Promise<InstagramLoginResult> {
    const IG_SIG_KEY = '19ce5f445dbfd9d29c59dc2a78c616a7fc090a8e018b9267bc4240a30244c53b';
    const cleanCode = code.trim();

    // Try verification methods: '1' (Authenticator App / TOTP) then '2' (SMS OTP)
    for (const method of ['1', '2']) {
      try {
        console.log(`[Instagram Mobile 2FA] Submitting code for ${this.username} via method ${method}...`);
        const payload = {
          verification_code: cleanCode,
          code: cleanCode,
          two_factor_identifier: identifier,
          username: this.username,
          device_id: this.baseDeviceId,
          trust_this_device: '1',
          verification_method: method,
        };
        const jsonPayload = JSON.stringify(payload);
        const signature = crypto.createHmac('sha256', IG_SIG_KEY).update(jsonPayload).digest('hex');
        const postBody = `ig_sig_key_version=4&signed_body=${signature}.${encodeURIComponent(jsonPayload)}`;

        const response = await this.http.post('https://i.instagram.com/api/v1/accounts/two_factor_login/', postBody, {
          headers: {
            'User-Agent': this.baseUserAgent,
            'Accept-Language': 'en-US',
            'X-IG-Connection-Type': 'WIFI',
            'X-IG-Capabilities': '36r/Fx8=',
            'Cookie': this.formatCookieHeader(),
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          validateStatus: () => true,
        });

        const setCookies = response.headers['set-cookie'] || [];
        if (Array.isArray(setCookies)) {
          this.webCookies.push(...setCookies);
        }

        let foundSessionId = '';
        for (const c of this.webCookies) {
          const m = c.match(/sessionid=([^;]+)/);
          if (m) foundSessionId = m[1];
        }

        if (response.data?.status === 'ok' && (foundSessionId || response.data?.logged_in_user)) {
          const authTok = `Bearer IGT:2:${Buffer.from(JSON.stringify({ 
            sessionid: foundSessionId,
            user: response.data.logged_in_user 
          })).toString('base64')}`;
          return {
            status: 'SUCCESS',
            authorizationToken: authTok,
            sessionId: foundSessionId,
          };
        }

        if (response.data?.message?.includes('security code') || response.data?.message?.includes('invalid')) {
          if (method === '2') {
            return {
              status: 'BAD_CREDENTIALS',
              message: 'Invalid 2FA verification code. Please check your Authenticator app or SMS.',
            };
          }
        }
      } catch (err: any) {
        console.warn(`[Instagram Mobile 2FA Error method ${method}]:`, err.message);
      }
    }

    return {
      status: 'ERROR',
      message: 'Mobile 2FA verification failed.',
    };
  }

  /**
   * Verifies standard TOTP 2FA code, SMS code, backup recovery code, or security checkpoint
   */
  async verifyTwoFactorCode(code: string, context?: string, method?: string): Promise<InstagramLoginResult> {
    const cleanCode = code.trim();
    const twoFactorContext = context || this.currentDataContext;
    const identifier = this.mobileTwoFactorIdentifier || this.webTwoFactorIdentifier || twoFactorContext || '';

    // 0. Navigation Challenge (xr0ni take_challenge flow)
    if (this.challengeType === 'NAV_CHALLENGE') {
      return this.enterNavigationChallengeCode(cleanCode);
    }

    // 1. Web Checkpoint (Email or Phone SMS security code verification)
    if (this.challengeType === 'WEB_CHECKPOINT' || (twoFactorContext && twoFactorContext.includes('/challenge/'))) {
      const targetUrl = this.webCheckpointUrl || twoFactorContext;
      console.log(`[Instagram Checkpoint Verify] Submitting code to ${targetUrl}...`);
      try {
        const postData = new URLSearchParams({
          security_code: cleanCode,
        });

        const verifyRes = await this.http.post(targetUrl, postData.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Cookie': this.formatCookieHeader(),
            'X-CSRFToken': this.extractCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': targetUrl,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          maxRedirects: 5,
          validateStatus: () => true,
        });

        const newCookies = verifyRes.headers['set-cookie'] || [];
        this.webCookies.push(...newCookies);

        let foundSessionId = '';
        for (const c of this.webCookies) {
          const m = c.match(/sessionid=([^;]+)/);
          if (m) foundSessionId = m[1];
        }

        if (foundSessionId || verifyRes.data?.status === 'ok' || verifyRes.status === 200) {
          if (foundSessionId) {
            const authTok = `Bearer IGT:2:${Buffer.from(JSON.stringify({ sessionid: foundSessionId })).toString('base64')}`;
            return {
              status: 'SUCCESS',
              authorizationToken: authTok,
              sessionId: foundSessionId,
            };
          }
        }

        const errText = typeof verifyRes.data === 'string' ? verifyRes.data : JSON.stringify(verifyRes.data);
        if (errText.includes('Please check the code') || errText.includes('incorrect') || errText.includes('invalid') || errText.includes('security_code')) {
          return {
            status: 'BAD_CREDENTIALS',
            message: 'Invalid verification code entered. Please check your SMS / Email and try again.',
            errorCode: 'INVALID_2FA_CODE',
          };
        }

        return {
          status: 'ERROR',
          message: verifyRes.data?.message || 'Verification could not be confirmed. Please check the code or connect via Session ID.',
        };
      } catch (cpErr: any) {
        console.error('[Instagram Checkpoint Verify Error]:', cpErr);
        return {
          status: 'ERROR',
          message: cpErr.message || 'Error communicating with Instagram checkpoint verification.',
        };
      }
    }

    // 2. Web 2FA verification (Supports TOTP, SMS, Backup Code, WhatsApp)
    if (this.challengeType === 'WEB_2FA' || this.webTwoFactorIdentifier || identifier) {
      console.log(`[Instagram 2FA] Trying Web 2FA verification for @${this.username}...`);
      try {
        const isBackupCode = method === '3' || cleanCode.length === 8;
        const verificationMethod = method || (isBackupCode ? '3' : '1');

        const postData = new URLSearchParams({
          username: this.username,
          verificationCode: cleanCode,
          identifier: this.webTwoFactorIdentifier || identifier,
          verification_method: verificationMethod,
          trust_this_device: '1',
          queryParams: '{}',
        });

        const twoFaRes = await this.http.post('https://www.instagram.com/api/v1/web/accounts/login/ajax/two_factor/', postData.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Cookie': this.formatCookieHeader(),
            'X-CSRFToken': this.extractCsrfToken(),
            'X-IG-App-ID': '936619743392459',
            'X-ASBD-ID': '129477',
            'X-IG-WWW-Claim': '0',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://www.instagram.com/accounts/login/two_factor',
            'Origin': 'https://www.instagram.com',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          validateStatus: () => true,
        });

        const cookies = twoFaRes.headers['set-cookie'] || [];
        this.webCookies.push(...cookies);

        let foundSessionId = '';
        for (const c of this.webCookies) {
          const m = c.match(/sessionid=([^;]+)/);
          if (m) foundSessionId = m[1];
        }

        if (foundSessionId || twoFaRes.data?.authenticated) {
          const authTok = `Bearer IGT:2:${Buffer.from(JSON.stringify({ 
            sessionid: foundSessionId,
            userId: twoFaRes.data?.userId 
          })).toString('base64')}`;
          return {
            status: 'SUCCESS',
            authorizationToken: authTok,
            sessionId: foundSessionId,
          };
        }

        if (twoFaRes.data?.message) {
          const isInvalidCode = twoFaRes.data.message.includes('check the security code') || 
                                twoFaRes.data.message.includes('invalid') || 
                                twoFaRes.data.message.includes('code');
          return {
            status: 'BAD_CREDENTIALS',
            message: isInvalidCode
              ? (isBackupCode 
                  ? 'Invalid backup recovery code. Please check your 8-digit backup code and try again.' 
                  : 'Invalid 2FA verification code. Please check your Authenticator app or SMS.')
              : twoFaRes.data.message,
            errorCode: 'INVALID_2FA_CODE',
          };
        }
      } catch (web2faErr: any) {
        console.error('[Instagram Web 2FA Verify Error]:', web2faErr.message);
      }

      // Mobile 2FA fallback if this originated from a mobile challenge
      if (this.challengeType === 'MOBILE_2FA' || this.mobileTwoFactorIdentifier) {
        console.log(`[Instagram 2FA] Trying Mobile 2FA fallback for @${this.username}...`);
        const mobileRes = await this.verifyMobileTwoFactor(cleanCode, this.mobileTwoFactorIdentifier || identifier);
        if (mobileRes.status === 'SUCCESS' || mobileRes.status === 'BAD_CREDENTIALS') {
          return mobileRes;
        }
      }
    }

    // 3. Mobile Bloks SECURE_CHALLENGE
    if (this.challengeType === 'SECURE_CHALLENGE') {
      return this.enterSecureCodeRequest(cleanCode, twoFactorContext);
    }

    // 4. Mobile Bloks 2FA TOTP
    const postData = new URLSearchParams();
    postData.append(
      'params',
      JSON.stringify({
        client_input_params: {
          auth_secure_device_id: '',
          machine_id: this.baseMachineId,
          code,
          should_trust_device: 1,
          family_device_id: this.baseHeaderFamilyDeviceId,
          device_id: this.baseDeviceId,
        },
        server_params: {
          INTERNAL__latency_qpl_marker_id: 36707139,
          device_id: this.baseDeviceId,
          challenge: 'totp',
          machine_id: null,
          INTERNAL__latency_qpl_instance_id: 2.7604101900059e13,
          two_step_verification_context: twoFactorContext,
          flow_source: 'two_factor_login',
        },
      })
    );
    postData.append('bloks_versioning_id', this.baseBlocksVersioningId);

    const res = await this.http.post(
      `${this.baseUrl}com.bloks.www.two_step_verification.verify_code.async/`,
      postData.toString(),
      {
        headers: this.getHeaders(),
        maxRedirects: 0,
        validateStatus: () => true,
      }
    );

    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    console.log(`[Instagram 2FA Verify] Response status: ${res.status}, snippet: ${body.slice(0, 300)}`);

    if (body.includes('IG-Set-Authorization') || body.includes('logged_in_user')) {
      const { authToken, sessionId } = this.extractAuth(body);
      return {
        status: 'SUCCESS',
        authorizationToken: authToken,
        sessionId,
      };
    }

    // If TOTP verification failed, attempt secure code verification in case it was a checkpoint
    if (!body.includes('security code and try again')) {
      console.log('[Instagram 2FA Verify] Attempting secure code entry as fallback...');
      const fallback = await this.enterSecureCodeRequest(code, twoFactorContext);
      if (fallback.status === 'SUCCESS') return fallback;
    }

    if (body.includes('security code and try again')) {
      return { status: 'BAD_CREDENTIALS', message: 'Invalid 2FA code entered', errorCode: 'INVALID_2FA_CODE' };
    }

    return { status: 'ERROR', message: 'Verification failed' };
  }

  /**
   * Resends 2FA code via SMS or WhatsApp
   */
  async resendTwoFactorCode(method: 'sms' | 'whatsapp' = 'sms'): Promise<{ success: boolean; message: string }> {
    try {
      const identifier = this.webTwoFactorIdentifier || this.mobileTwoFactorIdentifier || this.currentDataContext;
      console.log(`[Instagram 2FA Resend] Requesting resend via ${method} for @${this.username}...`);

      const postData = new URLSearchParams({
        username: this.username,
        identifier: identifier,
        verification_method: method === 'whatsapp' ? '6' : '2',
      });

      const res = await this.http.post('https://www.instagram.com/api/v1/web/accounts/login/ajax/two_factor/resend/', postData.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Cookie': this.formatCookieHeader(),
          'X-CSRFToken': this.extractCsrfToken(),
          'X-IG-App-ID': '936619743392459',
          'X-ASBD-ID': '129477',
          'X-IG-WWW-Claim': '0',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://www.instagram.com/accounts/login/two_factor',
          'Origin': 'https://www.instagram.com',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        validateStatus: () => true,
      });

      if (res.data?.status === 'ok' || res.data?.message?.includes('sent') || res.status === 200) {
        return {
          success: true,
          message: method === 'whatsapp' 
            ? 'A new verification code has been dispatched to your WhatsApp.'
            : 'A new verification code has been dispatched to your mobile number via SMS.',
        };
      }

      // Fallback: private mobile SMS dispatch
      if (method === 'sms') {
        const IG_SIG_KEY = '19ce5f445dbfd9d29c59dc2a78c616a7fc090a8e018b9267bc4240a30244c53b';
        const mobilePayload = JSON.stringify({
          two_factor_identifier: identifier,
          username: this.username,
          device_id: this.baseDeviceId,
        });
        const signature = crypto.createHmac('sha256', IG_SIG_KEY).update(mobilePayload).digest('hex');
        const mobilePost = `ig_sig_key_version=4&signed_body=${signature}.${encodeURIComponent(mobilePayload)}`;

        const mobileRes = await this.http.post('https://i.instagram.com/api/v1/accounts/send_two_factor_login_sms/', mobilePost, {
          headers: {
            'User-Agent': this.baseUserAgent,
            'Cookie': this.formatCookieHeader(),
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          validateStatus: () => true,
        });

        if (mobileRes.data?.status === 'ok') {
          return {
            success: true,
            message: 'A new verification code has been sent to your registered phone number.',
          };
        }
      }

      return {
        success: false,
        message: res.data?.message || 'Could not resend verification code. Please wait a moment before trying again.',
      };
    } catch (err: any) {
      console.error('[Instagram 2FA Resend Error]:', err.message);
      return {
        success: false,
        message: err.message || 'Error communicating with Instagram to resend code.',
      };
    }
  }

  /**
   * Checks if user approved "This was me" in their Instagram mobile app
   */
  async checkInAppApproval(): Promise<InstagramLoginResult> {
    try {
      console.log(`[Instagram In-App Approval] Checking device approval status for @${this.username}...`);

      // 1. If we have a checkpoint URL
      if (this.webCheckpointUrl) {
        const cpRes = await this.http.get(this.webCheckpointUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Cookie': this.formatCookieHeader(),
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://www.instagram.com/accounts/login/',
            'Accept': 'application/json, text/html, */*',
          },
          maxRedirects: 5,
          validateStatus: () => true,
        });

        const newCookies = cpRes.headers['set-cookie'] || [];
        this.webCookies.push(...newCookies);

        let foundSessionId = '';
        for (const c of this.webCookies) {
          const m = c.match(/sessionid=([^;]+)/);
          if (m) foundSessionId = m[1];
        }

        if (foundSessionId || cpRes.data?.authenticated || (cpRes.status === 200 && cpRes.data?.status === 'ok')) {
          if (foundSessionId) {
            const authTok = `Bearer IGT:2:${Buffer.from(JSON.stringify({ sessionid: foundSessionId })).toString('base64')}`;
            return {
              status: 'SUCCESS',
              authorizationToken: authTok,
              sessionId: foundSessionId,
            };
          }
        }
      }

      // 2. Check via Web 2FA poll/check
      const identifier = this.webTwoFactorIdentifier || this.mobileTwoFactorIdentifier || this.currentDataContext;
      if (identifier) {
        const postData = new URLSearchParams({
          username: this.username,
          identifier: identifier,
          check_approval: '1',
        });

        const pollRes = await this.http.post('https://www.instagram.com/api/v1/web/accounts/login/ajax/two_factor/', postData.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Cookie': this.formatCookieHeader(),
            'X-CSRFToken': this.extractCsrfToken(),
            'X-IG-App-ID': '936619743392459',
            'X-ASBD-ID': '129477',
            'X-IG-WWW-Claim': '0',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://www.instagram.com/accounts/login/two_factor',
            'Origin': 'https://www.instagram.com',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          validateStatus: () => true,
        });

        const cookies = pollRes.headers['set-cookie'] || [];
        this.webCookies.push(...cookies);

        let foundSessionId = '';
        for (const c of this.webCookies) {
          const m = c.match(/sessionid=([^;]+)/);
          if (m) foundSessionId = m[1];
        }

        if (foundSessionId || pollRes.data?.authenticated) {
          const authTok = `Bearer IGT:2:${Buffer.from(JSON.stringify({ 
            sessionid: foundSessionId,
            userId: pollRes.data?.userId 
          })).toString('base64')}`;
          return {
            status: 'SUCCESS',
            authorizationToken: authTok,
            sessionId: foundSessionId,
          };
        }
      }

      return {
        status: 'PENDING_APPROVAL',
        context: this.serializeState(),
        message: 'Approval pending. Please open Instagram on your phone and tap "This was me", then try again.',
        errorCode: 'PENDING_APPROVAL',
      };
    } catch (err: any) {
      console.error('[Instagram Approval Check Error]:', err.message);
      return {
        status: 'PENDING_APPROVAL',
        context: this.serializeState(),
        message: 'Could not verify approval yet. Please make sure you approved the prompt on your phone.',
        errorCode: 'PENDING_APPROVAL',
      };
    }
  }
}
