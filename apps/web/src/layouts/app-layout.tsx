import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Search, Play, Users, UserCheck } from 'lucide-react';
import { Sidebar } from '../components/sidebar';
import { Logo } from '../components/logo';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground">
      {/* Mobile Top Navbar */}
      <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <Logo size={24} />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 border border-white/10 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Slide-out Drawer */}
      <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar onClose={() => setMobileOpen(false)} />
      </div>

      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block fixed inset-y-0 left-0 w-64 z-40">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl w-full pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Quick Bar for instant phone access */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/90 backdrop-blur-2xl border-t border-white/5 px-4 py-2 flex justify-around items-center">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `flex flex-col items-center gap-1 py-1 text-[11px] ${isActive ? 'text-blue-400 font-bold' : 'text-zinc-400'}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink 
          to="/analyzer" 
          className={({ isActive }) => `flex flex-col items-center gap-1 py-1 text-[11px] ${isActive ? 'text-blue-400 font-bold' : 'text-zinc-400'}`}
        >
          <Search size={18} />
          <span>Analyzer</span>
        </NavLink>
        <NavLink 
          to="/sessions" 
          className={({ isActive }) => `flex flex-col items-center gap-1 py-1 text-[11px] ${isActive ? 'text-blue-400 font-bold' : 'text-zinc-400'}`}
        >
          <Play size={18} />
          <span>Sessions</span>
        </NavLink>
        <NavLink 
          to="/accounts" 
          className={({ isActive }) => `flex flex-col items-center gap-1 py-1 text-[11px] ${isActive ? 'text-blue-400 font-bold' : 'text-zinc-400'}`}
        >
          <Users size={18} />
          <span>Accounts</span>
        </NavLink>
      </nav>
    </div>
  );
}