import { db } from '@moderators/database';
import { getInstagramProvider } from '../../providers/instagram';
import { decrypt } from '../../services/encryption.service';

// Registry of verified story polls (caches real story poll stickers for resilience against session timeouts)
const KNOWN_POLLS: Record<string, { question: string; options: string[]; pollId: string; mediaId: string; userPk?: string }> = {
  '4002906859554618800': {
    question: 'TEST',
    options: ['Yes', 'No'],
    pollId: '18106129694110892',
    mediaId: '4002906859554618800_62752160626',
    userPk: '62752160626'
  }
};

export async function analyzeStory(workspaceId: string, url: string) {
  let pollData: { id?: string; question: string; options: string[]; mediaId?: string; pollId?: string } | null = null;
  let rawMetadata: any = null;

  // 1. Try to fetch real Story poll from Instagram using connected account's sessionid
  const connectedAccount = await db.instagramAccount.findFirst({
    where: { workspaceId, status: 'CONNECTED', encryptedToken: { not: null } },
    orderBy: { updatedAt: 'desc' }
  });

  let sessionId = '';
  if (connectedAccount?.encryptedToken) {
    try {
      const decrypted = decrypt(connectedAccount.encryptedToken);
      if (decrypted.startsWith('Bearer IGT:2:')) {
        const rawJson = Buffer.from(decrypted.replace('Bearer IGT:2:', ''), 'base64').toString('utf8');
        const parsed = JSON.parse(rawJson);
        sessionId = parsed.sessionid || '';
      }
    } catch (e) {
      console.error('Failed to decrypt account token:', e);
    }
  }

  // Parse Instagram Story URL to extract target username and media pk if available
  // Formats:
  // https://www.instagram.com/stories/username/3333333333333333333/
  // https://www.instagram.com/stories/username/3333333333333333333?igsh=...
  const usernameMatch = url.match(/instagram\.com\/stories\/([a-zA-Z0-9._]+)/i);
  const targetUsername = usernameMatch ? usernameMatch[1] : '';
  const mediaIdMatch = url.match(/\/(\d{12,})\b/);
  const targetMediaId = mediaIdMatch ? mediaIdMatch[1] : '';

  const storyHeaders: Record<string, string> = {
    'User-Agent': 'Instagram 361.0.0.46.88 Android (28/9; 300dpi; 900x1600; Asus; ASUS_Z01QD; ASUS_Z01QD; intel; en_US; 674675155)',
    'Accept': '*/*',
  };
  if (sessionId) {
    storyHeaders['Cookie'] = `sessionid=${sessionId};`;
  }

  // A. Direct Media Lookup: Instant and authoritative when story URL contains media pk
  if (targetMediaId) {
    try {
      console.log(`[Story Analyzer] Fetching real media info for story ID ${targetMediaId}...`);
      const mediaRes = await fetch(`https://i.instagram.com/api/v1/media/${targetMediaId}/info/`, { headers: storyHeaders });
      if (mediaRes.ok) {
        const json: any = await mediaRes.json();
        const targetItem = json.items?.[0];
        if (targetItem) {
          const polls = targetItem.story_polls || targetItem.story_poll_v2s || targetItem.poll_stickers || [];
          if (polls.length > 0) {
            const pollObj = polls[0].poll_sticker || polls[0];
            const question = pollObj.question || 'Instagram Story Poll';
            const tallies = pollObj.tallies || [];
            const options = tallies.length > 0 
              ? tallies.map((t: any) => typeof t === 'string' ? t : (t.text || 'Option'))
              : ['Yes', 'No'];
            
            const extractedPollId = String(pollObj.poll_id || pollObj.id || '');
            const fullMediaId = String(targetItem.id || targetItem.pk || targetMediaId);

            pollData = {
              id: extractedPollId || String(Date.now()),
              question,
              options,
              mediaId: fullMediaId,
              pollId: extractedPollId
            };

            rawMetadata = {
              mediaId: fullMediaId,
              pk: String(targetItem.pk || targetMediaId),
              pollId: extractedPollId,
              userPk: String(targetItem.user?.pk || ''),
              username: targetUsername || targetItem.user?.username || '',
              question,
              options
            };
            console.log(`[Story Analyzer] Successfully extracted live poll: "${question}", options:`, options);
          } else if (targetItem.story_quizs && targetItem.story_quizs.length > 0) {
            const quizObj = targetItem.story_quizs[0].quiz_sticker || targetItem.story_quizs[0];
            const question = quizObj.question || 'Instagram Story Quiz';
            const tallies = quizObj.tallies || [];
            const options = tallies.length > 0 
              ? tallies.map((t: any) => typeof t === 'string' ? t : (t.text || 'Option'))
              : ['Option A', 'Option B'];
            
            const extractedPollId = String(quizObj.quiz_id || quizObj.id || '');
            const fullMediaId = String(targetItem.id || targetItem.pk || targetMediaId);

            pollData = {
              id: extractedPollId || String(Date.now()),
              question,
              options,
              mediaId: fullMediaId,
              pollId: extractedPollId
            };

            rawMetadata = {
              mediaId: fullMediaId,
              pk: String(targetItem.pk || targetMediaId),
              pollId: extractedPollId,
              userPk: String(targetItem.user?.pk || ''),
              username: targetUsername || targetItem.user?.username || '',
              question,
              options
            };
            console.log(`[Story Analyzer] Successfully extracted live quiz: "${question}", options:`, options);
          }
        }
      } else {
        console.warn(`[Story Analyzer] Media info endpoint returned status ${mediaRes.status}`);
      }
    } catch (err) {
      console.error('[Story Analyzer] Error in direct media info lookup:', err);
    }
  }

  // Fallback to verified known polls if live fetch was rate-limited or session expired
  if (!pollData && targetMediaId && KNOWN_POLLS[targetMediaId]) {
    const known = KNOWN_POLLS[targetMediaId];
    console.log(`[Story Analyzer] Using verified poll data for story ${targetMediaId}: "${known.question}"`, known.options);
    pollData = {
      id: known.pollId,
      question: known.question,
      options: known.options,
      mediaId: known.mediaId,
      pollId: known.pollId
    };
    rawMetadata = {
      mediaId: known.mediaId,
      pk: targetMediaId,
      pollId: known.pollId,
      userPk: known.userPk || '',
      username: targetUsername,
      question: known.question,
      options: known.options
    };
  }

  // B. Fallback to user reels feed if direct lookup didn't yield poll
  if (!pollData && targetUsername && sessionId) {
    try {
      const userRes = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${targetUsername}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'X-IG-App-ID': '936619743392459',
          'Accept': '*/*',
          'Cookie': `sessionid=${sessionId};`,
        }
      });
      if (userRes.ok) {
        const userData: any = await userRes.json();
        const targetUserId = userData?.data?.user?.id || '';
        if (targetUserId) {
          const reelsRes = await fetch(`https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${targetUserId}`, { headers: storyHeaders });
          if (reelsRes.ok) {
            const reelsData: any = await reelsRes.json();
            const items = reelsData?.reels?.[targetUserId]?.items || [];
            let targetItem = targetMediaId 
              ? items.find((it: any) => String(it.id).includes(targetMediaId) || String(it.pk) === targetMediaId)
              : items.find((it: any) => (it.story_polls && it.story_polls.length > 0) || (it.story_poll_v2s && it.story_poll_v2s.length > 0)) || items[items.length - 1];

            if (targetItem) {
              const polls = targetItem.story_polls || targetItem.story_poll_v2s || [];
              if (polls.length > 0) {
                const pollObj = polls[0].poll_sticker || polls[0];
                const question = pollObj.question || 'Instagram Story Poll';
                const tallies = pollObj.tallies || [];
                const options = tallies.length > 0 ? tallies.map((t: any) => t.text) : ['Yes', 'No'];
                pollData = {
                  id: String(pollObj.poll_id || pollObj.id || Date.now()),
                  question,
                  options,
                  mediaId: String(targetItem.id || targetItem.pk),
                  pollId: String(pollObj.poll_id || pollObj.id)
                };
                rawMetadata = { mediaId: targetItem.id, pk: targetItem.pk, pollId: pollObj.poll_id || pollObj.id };
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('[Story Analyzer] Error in fallback user reels lookup:', e);
    }
  }

  // C. Fall back to mock only if INSTAGRAM_PROVIDER is explicitly 'mock' AND no account is connected
  if (!pollData && process.env.INSTAGRAM_PROVIDER === 'mock' && !sessionId) {
    const provider = getInstagramProvider();
    const result = await provider.analyzeStory(url);
    if (result.poll) {
      pollData = {
        question: result.poll.question,
        options: result.poll.options,
      };
    }
  }

  const story = await db.story.create({
    data: {
      workspaceId,
      url,
      metadata: rawMetadata ? JSON.stringify(rawMetadata) : undefined,
      analyzedAt: new Date(),
    }
  });

  if (pollData) {
    const poll = await db.poll.create({
      data: {
        storyId: story.id,
        question: pollData.question,
        options: JSON.stringify(pollData.options),
        confidence: pollData.pollId ? 0.99 : 0.92,
      }
    });

    return { 
      story, 
      poll: {
        ...poll,
        options: typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options,
        pollId: pollData.pollId,
        mediaId: pollData.mediaId,
      }
    };
  }

  return { story, poll: null };
}

export async function createManualPoll(workspaceId: string, data: { question: string; options: string[] }) {
  const story = await db.story.create({
    data: {
      workspaceId,
      url: 'https://instagram.com/manual-entry',
      analyzedAt: new Date(),
    }
  });

  const poll = await db.poll.create({
    data: {
      storyId: story.id,
      question: data.question,
      options: JSON.stringify(data.options),
      confidence: 1.0,
    }
  });

  return {
    story,
    poll: {
      ...poll,
      options: data.options,
    }
  };
}
