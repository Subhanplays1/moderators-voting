// ==========================================
// Shared Types — used by both frontend and backend
// ==========================================

// User
export interface ApiUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  globalRole: 'SUPER_ADMIN' | 'USER';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: ApiUser;
  workspace: ApiWorkspace | null;
}

// Workspace
export interface ApiWorkspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface ApiWorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRoleType;
  isActive: boolean;
  joinedAt: string;
  user: ApiUser;
}

export type WorkspaceRoleType = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'VIEWER';

// Instagram Account
export type AccountStatusType = 'CONNECTED' | 'PENDING' | 'DISCONNECTED' | 'REAUTH_REQUIRED' | 'ERROR';

export interface ApiInstagramAccount {
  id: string;
  workspaceId: string;
  username: string;
  displayName: string | null;
  status: AccountStatusType;
  profilePicture: string | null;
  addedBy: { id: string; name: string };
  lastCheckedAt: string | null;
  statusMessage: string | null;
  createdAt: string;
}

// Story & Poll
export interface ApiStory {
  id: string;
  url: string | null;
  screenshotPath: string | null;
  metadata: Record<string, unknown> | null;
  analyzedAt: string | null;
  createdAt: string;
  poll: ApiPoll | null;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface ApiPoll {
  id: string;
  storyId: string;
  question: string;
  options: PollOption[];
  confidence: number;
  detectedAt: string;
}

// Voting Session
export type SessionStatusType = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type SessionAccountStatusType = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface ApiVotingSession {
  id: string;
  workspaceId: string;
  pollId: string;
  name: string | null;
  selectedOption: string;
  status: SessionStatusType;
  totalAccounts: number;
  completed: number;
  failed: number;
  createdBy: { id: string; name: string };
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  poll?: ApiPoll;
}

export interface ApiSessionAccount {
  id: string;
  sessionId: string;
  accountId: string;
  status: SessionAccountStatusType;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  account: { id: string; username: string; status: AccountStatusType };
}

// Activity Log
export interface ApiActivityLog {
  id: string;
  workspaceId: string | null;
  userId: string | null;
  action: string;
  target: string | null;
  status: string;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}

// Invitation
export type InvitationStatusType = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface ApiInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRoleType;
  status: InvitationStatusType;
  invitedBy: { id: string; name: string };
  expiresAt: string;
  createdAt: string;
}

// Analytics
export interface AnalyticsOverview {
  totalAccounts: number;
  connectedAccounts: number;
  activeSessions: number;
  completedSessions: number;
  failedOperations: number;
  successRate: number;
  sessionsThisWeek: number;
  teamMembers: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Admin Health
export interface SystemHealth {
  backend: HealthStatus;
  database: HealthStatus;
  websocket: HealthStatus;
  storage: HealthStatus;
  authProvider: HealthStatus;
}

export interface HealthStatus {
  status: 'operational' | 'warning' | 'error';
  message: string;
  lastChecked: string;
}

// Import
export interface ImportResult {
  total: number;
  valid: number;
  duplicates: number;
  invalid: number;
  errors: ImportError[];
  accounts: ImportedAccount[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportedAccount {
  username: string;
  status: 'imported' | 'duplicate' | 'invalid';
  message?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// WebSocket Events
export interface WsEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
}

export interface SessionProgressPayload {
  sessionId: string;
  completed: number;
  failed: number;
  total: number;
  accountId: string;
  accountStatus: SessionAccountStatusType;
  error?: string;
}

export interface AccountStatusPayload {
  accountId: string;
  username: string;
  status: AccountStatusType;
  message?: string;
}

// API Error
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}
