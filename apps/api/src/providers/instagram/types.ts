export interface InstagramProvider {
  authenticate(accountId: string): Promise<void>;
  getAccountInfo(username: string): Promise<any>;
  analyzeStory(url: string): Promise<any>;
  getPoll(storyData: any): Promise<any>;
  submitVote(accountId: string, pollId: string, optionId: string): Promise<any>;
  getOperationStatus(operationId: string): Promise<any>;
  disconnect(accountId: string): Promise<void>;
  testConnection(accountId: string): Promise<boolean>;
}
