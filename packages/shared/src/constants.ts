import type { WorkspaceRoleType } from './types';

// ==========================================
// Permission definitions
// ==========================================

export const PERMISSIONS = {
  // Account management
  'accounts.view': ['OWNER', 'ADMIN', 'MODERATOR'],
  'accounts.create': ['OWNER', 'ADMIN'],
  'accounts.import': ['OWNER', 'ADMIN'],
  'accounts.connect': ['OWNER', 'ADMIN'],
  'accounts.disconnect': ['OWNER', 'ADMIN'],
  'accounts.delete': ['OWNER', 'ADMIN'],
  'accounts.test': ['OWNER', 'ADMIN', 'MODERATOR'],

  // Story analysis
  'stories.analyze': ['OWNER', 'ADMIN', 'MODERATOR'],
  'stories.view': ['OWNER', 'ADMIN', 'MODERATOR', 'VIEWER'],

  // Voting sessions
  'sessions.view': ['OWNER', 'ADMIN', 'MODERATOR', 'VIEWER'],
  'sessions.create': ['OWNER', 'ADMIN'],
  'sessions.start': ['OWNER', 'ADMIN'],
  'sessions.stop': ['OWNER', 'ADMIN'],
  'sessions.delete': ['OWNER', 'ADMIN'],

  // Team management
  'team.view': ['OWNER', 'ADMIN'],
  'team.invite': ['OWNER', 'ADMIN'],
  'team.update': ['OWNER', 'ADMIN'],
  'team.remove': ['OWNER', 'ADMIN'],

  // Analytics & Logs
  'analytics.view': ['OWNER', 'ADMIN'],
  'logs.view': ['OWNER', 'ADMIN'],

  // Settings
  'settings.workspace': ['OWNER', 'ADMIN'],
  'settings.profile': ['OWNER', 'ADMIN', 'MODERATOR', 'VIEWER'],

  // Admin
  'admin.access': ['OWNER'],
  'admin.system': ['OWNER'],
} as const satisfies Record<string, readonly WorkspaceRoleType[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: WorkspaceRoleType, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return (allowedRoles as readonly string[]).includes(role);
}

// ==========================================
// Status colors / labels
// ==========================================

export const ACCOUNT_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  CONNECTED: { label: 'Connected', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
  PENDING: { label: 'Pending', color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
  DISCONNECTED: { label: 'Disconnected', color: 'text-gray-400', bgColor: 'bg-gray-400/10' },
  REAUTH_REQUIRED: { label: 'Needs Reauth', color: 'text-orange-400', bgColor: 'bg-orange-400/10' },
  ERROR: { label: 'Error', color: 'text-red-400', bgColor: 'bg-red-400/10' },
};

export const SESSION_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-400', bgColor: 'bg-gray-400/10' },
  RUNNING: { label: 'Running', color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
  PAUSED: { label: 'Paused', color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
  COMPLETED: { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
  FAILED: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-400/10' },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-400', bgColor: 'bg-gray-400/10' },
};

export const ROLE_CONFIG: Record<WorkspaceRoleType, { label: string; color: string; bgColor: string; description: string }> = {
  OWNER: { label: 'Owner', color: 'text-purple-400', bgColor: 'bg-purple-400/10', description: 'Full access to everything' },
  ADMIN: { label: 'Admin', color: 'text-blue-400', bgColor: 'bg-blue-400/10', description: 'Manage accounts, sessions, and team' },
  MODERATOR: { label: 'Moderator', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10', description: 'Analyze stories and view sessions' },
  VIEWER: { label: 'Viewer', color: 'text-gray-400', bgColor: 'bg-gray-400/10', description: 'Read-only access' },
};

// ==========================================
// API Routes
// ==========================================

export const API_ROUTES = {
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_ME: '/api/auth/me',
  AUTH_FORGOT_PASSWORD: '/api/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/api/auth/reset-password',

  // Accounts
  ACCOUNTS: '/api/accounts',
  ACCOUNTS_IMPORT: '/api/accounts/import',

  // Stories
  STORIES_ANALYZE: '/api/stories/analyze',

  // Sessions
  SESSIONS: '/api/sessions',

  // Team
  TEAM: '/api/team',
  TEAM_INVITE: '/api/team/invite',
  TEAM_ACCEPT: '/api/team/accept-invite',

  // Logs
  LOGS: '/api/logs',

  // Analytics
  ANALYTICS: '/api/analytics',
  ANALYTICS_OVERVIEW: '/api/analytics/overview',
  ANALYTICS_SESSIONS: '/api/analytics/sessions',
  ANALYTICS_ACCOUNTS: '/api/analytics/accounts',
  ANALYTICS_TEAM: '/api/analytics/team',

  // Admin
  ADMIN_HEALTH: '/api/admin/health',
  ADMIN_OVERVIEW: '/api/admin/overview',

  // Settings
  SETTINGS_WORKSPACE: '/api/settings/workspace',
  SETTINGS_PROFILE: '/api/settings/profile',
  SETTINGS_SECURITY: '/api/settings/security',
} as const;

// ==========================================
// Misc Constants
// ==========================================

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

export const INVITATION_EXPIRY_DAYS = 7;

export const MAX_IMPORT_SIZE = 10000; // Max accounts per import

export const SUPPORTED_IMPORT_FORMATS = ['csv', 'txt'] as const;

export const WS_EVENTS = {
  SESSION_PROGRESS: 'session:progress',
  SESSION_COMPLETE: 'session:complete',
  SESSION_ERROR: 'session:error',
  ACCOUNT_STATUS: 'account:status',
  ACTIVITY_NEW: 'activity:new',
  SYSTEM_HEALTH: 'system:health',
} as const;
