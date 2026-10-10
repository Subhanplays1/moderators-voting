const fs = require('fs');
const path = require('path');
const baseDir = 'd:/Documents/antigravity/voting/apps/web';

const remainingFiles = [
  // UI Components
  'src/components/ui/dialog.tsx',
  'src/components/ui/dropdown-menu.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/table.tsx',
  'src/components/ui/tabs.tsx',
  'src/components/ui/badge.tsx',
  'src/components/ui/avatar.tsx',
  'src/components/ui/tooltip.tsx',
  'src/components/ui/skeleton.tsx',
  'src/components/ui/progress.tsx',
  'src/components/ui/separator.tsx',
  'src/components/ui/switch.tsx',
  'src/components/ui/textarea.tsx',
  'src/components/ui/scroll-area.tsx',
  'src/components/ui/checkbox.tsx',
  'src/components/ui/radio-group.tsx',
  'src/components/ui/toast.tsx',
  'src/components/ui/toaster.tsx',
  'src/hooks/use-toast.ts',
  
  // Core Components
  'src/components/logo.tsx',
  'src/components/page-header.tsx',
  'src/components/status-badge.tsx',
  'src/components/empty-state.tsx',
  'src/components/data-table.tsx',
  'src/components/loading-overlay.tsx',
  'src/components/confirm-dialog.tsx',
  'src/hooks/use-permissions.ts',

  // Services
  'src/services/auth.service.ts',
  'src/services/accounts.service.ts',
  'src/services/stories.service.ts',
  'src/services/sessions.service.ts',
  'src/services/team.service.ts',
  'src/services/logs.service.ts',
  'src/services/analytics.service.ts',
  'src/services/settings.service.ts',
  'src/services/admin.service.ts',
  
  // Layouts & Nav
  'src/components/header.tsx',
  'src/components/mobile-nav.tsx',

  // Auth Pages
  'src/pages/auth/register.tsx',
  'src/pages/auth/forgot-password.tsx',
  'src/pages/auth/reset-password.tsx',

  // Dashboard components
  'src/components/dashboard/stat-card.tsx',
  'src/components/dashboard/active-sessions.tsx',
  'src/components/dashboard/recent-activity.tsx',
  'src/components/dashboard/account-health.tsx',
  'src/components/dashboard/sessions-chart.tsx',

  // Accounts
  'src/pages/accounts/index.tsx',
  'src/pages/accounts/account-detail.tsx',
  'src/components/accounts/import-dialog.tsx',
  'src/components/accounts/connect-dialog.tsx',
  'src/components/accounts/account-actions.tsx',

  // Analyzer
  'src/components/story-analyzer/url-input.tsx',
  'src/components/story-analyzer/analysis-progress.tsx',
  'src/components/story-analyzer/poll-result.tsx',
  'src/components/story-analyzer/manual-entry.tsx',
  'src/components/story-analyzer/screenshot-upload.tsx',

  // Sessions
  'src/pages/sessions/index.tsx',
  'src/pages/sessions/session-detail.tsx',
  'src/components/sessions/create-session-dialog.tsx',
  'src/components/sessions/session-progress.tsx',
  'src/components/sessions/account-status-table.tsx',

  // Team
  'src/pages/team/index.tsx',
  'src/components/team/invite-dialog.tsx',
  'src/components/team/member-actions.tsx',
  'src/pages/team/accept-invite.tsx',

  // Logs & Analytics
  'src/pages/logs/index.tsx',
  'src/pages/analytics/index.tsx',
  'src/components/analytics/overview-stats.tsx',
  'src/components/analytics/sessions-chart.tsx',
  'src/components/analytics/accounts-chart.tsx',
  'src/components/analytics/team-activity.tsx',

  // Settings
  'src/pages/settings/index.tsx',
  'src/pages/settings/workspace.tsx',
  'src/pages/settings/profile.tsx',
  'src/pages/settings/security.tsx',
  'src/pages/settings/appearance.tsx',

  // Admin
  'src/pages/admin/index.tsx',
  'src/pages/admin/system-health.tsx',
  'src/components/admin/health-indicator.tsx',
];

for (const file of remainingFiles) {
  const fullPath = path.join(baseDir, file);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  if (!fs.existsSync(fullPath)) {
    let content = '';
    
    // Auto-generate a dummy valid export based on the file name/type
    if (file.endsWith('.tsx')) {
      const nameMatch = path.basename(file, '.tsx').split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
      const componentName = nameMatch === 'Index' ? (path.basename(path.dirname(file)).charAt(0).toUpperCase() + path.basename(path.dirname(file)).slice(1)) : nameMatch;
      content = `export function ${componentName}() { return <div className="text-white p-4">Component: ${componentName}</div>; }`;
      if (file.includes('pages/')) {
        content = `export function ${componentName}() { return <div className="text-white p-4">Page: ${componentName}</div>; }`;
      }
    } else if (file.endsWith('.ts')) {
      if (file.includes('services/')) {
        content = `export const ${path.basename(file, '.ts').replace('.', '')} = {};`;
      } else if (file.includes('hooks/')) {
        const hookName = path.basename(file, '.ts').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        content = `export function ${hookName}() { return {}; }`;
      } else {
        content = `export {};`;
      }
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Generated:', file);
  }
}
