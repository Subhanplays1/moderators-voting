import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Play, 
  Users, 
  UserCheck, 
  FileText, 
  BarChart3, 
  Settings, 
  ShieldAlert,
  LogOut,
  X
} from 'lucide-react';
import { Logo } from './logo';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Story Analyzer', href: '/analyzer', icon: Search },
  { title: 'Voting Sessions', href: '/sessions', icon: Play },
  { title: 'Accounts', href: '/accounts', icon: Users },
  { title: 'Team', href: '/team', icon: UserCheck },
  { title: 'Activity Logs', href: '/logs', icon: FileText },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Settings', href: '/settings', icon: Settings },
  { title: 'Admin Health', href: '/admin', icon: ShieldAlert },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-zinc-950/95 backdrop-blur-xl border-r border-white/5 flex flex-col h-full z-40">
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <Logo size={28} />
        {onClose && (
          <button 
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-3 mb-2">
          Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/25 shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                )
              }
            >
              <Icon size={18} className="transition-transform group-hover:scale-110 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5 bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase shadow-md shadow-blue-500/10 ring-1 ring-white/10 shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-semibold text-zinc-200 truncate">{user?.name || 'Moderator'}</p>
              <p className="text-[11px] text-zinc-500 truncate">{user?.email || 'admin@moderators.dev'}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Log Out"
            className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}