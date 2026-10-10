export const EVENTS = {
  VOTE_SUCCESS: 'VOTE_SUCCESS',
  VOTE_FAILED: 'VOTE_FAILED',
  SESSION_COMPLETED: 'SESSION_COMPLETED',
  SESSION_STARTED: 'SESSION_STARTED'
};

export type WSEvent = {
  type: string;
  payload: any;
};
