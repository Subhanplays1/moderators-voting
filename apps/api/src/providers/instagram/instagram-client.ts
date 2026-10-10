import axios from 'axios';
import crypto from 'crypto';

export interface InstagramLoginResult {
  status: 'SUCCESS' | '2FA' | 'SECURE_CHALLENGE' | 'BAD_CREDENTIALS' | 'ERROR';
  authorizationToken?: string;
  sessionId?: string;
  message?: string;
  context?: string;
}

export class InstagramBloksClient {
  private username: string;
  private password: string;
  private baseUrl = 'https://i.instagram.com/api/v1/bloks/apps/';
  private baseDeviceId = 'android-ec40bd6622ac9b21';
  private baseMachineId = 'Z5d97AABAAF0xC3_hhRHvlrYSyrM';
  private baseHeaderDeviceId = '552233dc-9663-4973-82bc-b00ad110137a';
  private baseHeaderFamilyDeviceId = 'd660a764-9ea5-4f2a-a358-ea3d5fa4bd8f';
  private baseUserAgent = 'Instagram 361.0.0.46.88 Android (28/9; 300dpi; 900x1600; Asus; ASUS_Z01QD; ASUS_Z01QD; intel; en_US; 674675155)';
  private baseBlocksVersioningId = '16e9197b928710eafdf1e803935ed8c450a1a2e3eb696bff1184df088b900bcf';

  public currentDataContext = '';
  public challengeType: '2FA' | 'SECURE_CHALLENGE' = '2FA';

  constructor(username: string, password = '') {
    this.username = username.replace(/^@/, '').trim();
    this.password = password;
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
          password: `#PWD_INSTAGRAM:0:${timestamp}:${this.password}`,
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

    const res = await axios.post(
      `${this.baseUrl}com.bloks.www.bloks.caa.login.async.send_login_request/`,
      postData.toString(),
      {
        headers: this.getHeaders(),
        maxRedirects: 0,
        validateStatus: () => true,
      }
    );

    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    try {
      const fs = await import('fs');
      fs.writeFileSync('d:/Documents/antigravity/voting/last_insta_response.txt', body);
    } catch {}
    console.log(`[Instagram Login] Response status: ${res.status}, length: ${body.length}, snippet: ${body.slice(0, 400)}`);

    // 1. Success check: Authorization token present
    if (body.includes('IG-Set-Authorization') || body.includes('logged_in_user')) {
      const { authToken, sessionId } = this.extractAuth(body);
      return {
        status: 'SUCCESS',
        authorizationToken: authToken,
        sessionId,
      };
    }

    // 2. Strict bad credentials / account recovery check BEFORE 2FA fallbacks
    const badCredentialKeywords = [
      'Recover your account',
      'account_recovery',
      'Unable to log in',
      'login_failure',
      'No account found',
      'Incorrect password',
      'The password you entered is incorrect',
      "doesn't match",
      'wrong password',
      'Please wait a few minutes before you try again',
      'Suspicious login attempt',
      'Your account has been locked',
      'Your account has been disabled',
    ];

    for (const kw of badCredentialKeywords) {
      if (body.toLowerCase().includes(kw.toLowerCase())) {
        let msg = 'Invalid Instagram username or password.';
        if (
          kw.toLowerCase().includes('recover your account') ||
          kw.toLowerCase().includes("doesn't match") ||
          kw.toLowerCase().includes('account_recovery')
        ) {
          msg = "Instagram rejected credentials: Password incorrect or Instagram requested account recovery.";
        } else if (kw.toLowerCase().includes('wait a few minutes')) {
          msg = 'Instagram rate limit: Please wait a few minutes before trying again.';
        } else if (kw.toLowerCase().includes('locked') || kw.toLowerCase().includes('disabled')) {
          msg = 'Your Instagram account has been locked or disabled by Instagram.';
        }
        return {
          status: 'BAD_CREDENTIALS',
          message: msg,
        };
      }
    }

    // 3. Two-Factor Authentication (Authenticator app TOTP)
    if (body.includes('redirection_to_two_fac')) {
      const match =
        body.match(/\\"INTERNAL_INFRA_screen_id\\"\).*?Make,\s*\\"(.*?)\\",\s*\\"two_factor_login\\"/) ||
        body.match(/\\"INTERNAL_INFRA_THEME\\"\).*?Make,\s*\\"(.*?)\\",\s*\\"two_factor_login\\"/);
      if (match) {
        this.currentDataContext = match[1];
        this.challengeType = '2FA';
        return {
          status: '2FA',
          context: this.currentDataContext,
          message: 'Two-Factor Authentication required. Enter the 6-digit code from your Authenticator app.',
        };
      }
    }

    if (body.includes('override_login_2fa_action') && body.includes('INTERNAL_INFRA_THEME')) {
      const match = body.match(/\\"INTERNAL_INFRA_THEME\\".*?Make,\s*\\"(.*?)\\",\s*\\"harm_f/);
      if (match) {
        this.currentDataContext = match[1];
        this.challengeType = '2FA';
        return {
          status: '2FA',
          context: this.currentDataContext,
          message: 'Two-Factor Authentication required. Enter the 6-digit code from your Authenticator app.',
        };
      }
    }

    // 4. Secure Challenge (SMS/Email security code checkpoint)
    if (body.includes('override_login_2fa_action') || body.includes('two_step_verification')) {
      const match = body.match(/\\"device_id\\".*?Make,\s*\\"(.*?)\\",\s*\\"/);
      if (match) {
        this.currentDataContext = match[1];
        this.challengeType = 'SECURE_CHALLENGE';

        // Trigger Instagram to actually dispatch the security code to SMS / Email
        console.log('[Instagram Login] Checkpoint detected. Requesting security code dispatch from Instagram...');
        const secureRes = await this.sendSecureCodeRequest();
        if (secureRes.success) {
          return {
            status: 'SECURE_CHALLENGE',
            context: this.currentDataContext,
            message: secureRes.contactPoint
              ? `Security code sent by Instagram to ${secureRes.contactPoint}.`
              : 'Security code dispatched to your phone or email.',
          };
        } else {
          return {
            status: 'ERROR',
            message: secureRes.message || 'Instagram checkpoint encountered, but failed to dispatch verification code.',
          };
        }
      }
    }

    return {
      status: 'ERROR',
      message: 'Failed to authenticate with Instagram. Response error from API.',
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

      const res1 = await axios.post(
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

      const res2 = await axios.post(
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

    const res = await axios.post(
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
   * Verifies standard TOTP 2FA code or falls back to secure code
   */
  async verifyTwoFactorCode(code: string, context?: string): Promise<InstagramLoginResult> {
    const twoFactorContext = context || this.currentDataContext;

    if (this.challengeType === 'SECURE_CHALLENGE') {
      return this.enterSecureCodeRequest(code, twoFactorContext);
    }

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

    const res = await axios.post(
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
      return { status: 'BAD_CREDENTIALS', message: 'Invalid 2FA code entered' };
    }

    return { status: 'ERROR', message: 'Verification failed' };
  }
}
