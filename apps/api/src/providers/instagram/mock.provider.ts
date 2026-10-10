import { InstagramProvider } from './types';

export class MockProvider implements InstagramProvider {
  async authenticate(accountId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
    if (Math.random() > 0.9) throw new Error('Authentication failed');
  }

  async getAccountInfo(username: string): Promise<any> {
    return { username, followers: 1000, following: 500 };
  }

  async analyzeStory(url: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    return {
      id: 'mock_story_id',
      poll: {
        id: 'mock_poll_id',
        question: 'Which design should we use?',
        options: ['Dark', 'Light']
      }
    };
  }

  async getPoll(storyData: any): Promise<any> {
    return storyData.poll;
  }

  async submitVote(accountId: string, pollId: string, optionId: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    if (Math.random() > 0.85) throw new Error('Vote submission failed');
    return { success: true, operationId: 'mock_op_' + Date.now() };
  }

  async getOperationStatus(operationId: string): Promise<any> {
    return { status: 'COMPLETED' };
  }

  async disconnect(accountId: string): Promise<void> {
    return;
  }

  async testConnection(accountId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    return Math.random() <= 0.95;
  }
}
