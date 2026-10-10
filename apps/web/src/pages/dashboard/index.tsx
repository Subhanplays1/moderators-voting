import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Play, 
  CheckCircle2, 
  Activity, 
  TrendingUp, 
  ShieldCheck, 
  Vote, 
  Sparkles,
  ArrowRight,
  Flame,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function Dashboard() {
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.get('/accounts');
      return res.data.accounts || [];
    },
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get('/sessions');
      return res.data.sessions || [];
    },
  });

  const accounts = accountsData || [];
  const sessions = sessionsData || [];

  const connectedCount = accounts.filter((a: any) => a.status === 'CONNECTED').length;
  const activeSessionsCount = sessions.filter((s: any) => s.status === 'RUNNING').length;
  const completedSessionsCount = sessions.filter((s: any) => s.status === 'COMPLETED').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner with Emblem and Glowing Accents */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black/80 ring-2 ring-white/10 shadow-2xl shrink-0 group">
              <img 
                src="/logo.png" 
                alt="Emblem" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase">
                  ATTACKER TEAM
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> ONLINE
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white font-serif uppercase mt-1">
                MODERATORS COMMAND
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mt-1">
                High-concurrency Instagram Story poll orchestration platform. Real-time telemetry and automated voting campaigns.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Link to="/analyzer" className="flex-1 sm:flex-initial">
              <Button className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 h-11 px-5 rounded-xl transition-all hover:scale-105">
                <Sparkles size={16} /> Analyze Story
              </Button>
            </Link>
            <Link to="/accounts" className="flex-1 sm:flex-initial">
              <Button variant="outline" className="w-full gap-2 border-white/10 hover:bg-white/5 h-11 px-5 rounded-xl">
                <Users size={16} /> Accounts
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Top 5 Statistics Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="border-white/5 bg-zinc-950/60 backdrop-blur-xl hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">Connected Accounts</CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Users size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{connectedCount}</div>
            <p className="text-[11px] text-zinc-500 mt-1">out of {accounts.length} registered</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-950/60 backdrop-blur-xl hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">Active Sessions</CardTitle>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Play size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-400">{activeSessionsCount}</div>
            <p className="text-[11px] text-blue-400/80 mt-1">Live telemetry stream</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-950/60 backdrop-blur-xl hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">Completed Sessions</CardTitle>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <CheckCircle2 size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{completedSessionsCount}</div>
            <p className="text-[11px] text-zinc-500 mt-1">Executed campaigns</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-950/60 backdrop-blur-xl hover:border-pink-500/30 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">Operation Success</CardTitle>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
              <TrendingUp size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-400">98.4%</div>
            <p className="text-[11px] text-emerald-400/80 mt-1">High conversion rate</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-950/60 backdrop-blur-xl hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">Provider Core</CardTitle>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <ShieldCheck size={16} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-white mt-1">Compliant</div>
            <p className="text-[11px] text-purple-300/80 mt-1">OAuth Bridge Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Campaign Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Active Campaigns Tracker */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Vote size={18} className="text-blue-400" /> Active Campaign Sessions
            </h2>
            <Link to="/sessions" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              View all sessions <ArrowRight size={12} />
            </Link>
          </div>

          {sessions.length === 0 ? (
            <Card className="border-white/5 bg-zinc-950/40 p-8 text-center text-zinc-400 rounded-2xl">
              <Vote className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
              <p className="text-sm font-semibold text-zinc-300">No active campaigns</p>
              <p className="text-xs text-zinc-500 mt-1 mb-4">Paste an Instagram story URL in the analyzer to launch your first session.</p>
              <Link to="/analyzer">
                <Button size="sm" className="gap-2 text-xs">
                  <Sparkles size={14} /> Open Story Analyzer
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 4).map((session: any) => {
                const progress = session.totalAccounts > 0
                  ? Math.round(((session.completed + session.failed) / session.totalAccounts) * 100)
                  : 0;

                return (
                  <Card key={session.id} className="border-white/5 bg-zinc-950/40 backdrop-blur-xl hover:border-white/10 transition-all rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-bold text-white text-sm">
                          {session.name || `Session #${session.id.slice(0, 8)}`}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          Target Option: <span className="text-blue-400 font-semibold">{session.selectedOption}</span>
                        </div>
                      </div>
                      <Badge variant={session.status === 'RUNNING' ? 'default' : 'secondary'}>
                        {session.status}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 mt-3">
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Progress</span>
                        <span className="text-zinc-200 font-mono font-bold">{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Account Network Health */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity size={18} className="text-emerald-400" /> Account Network Health
          </h2>
          <Card className="border-white/5 bg-zinc-950/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Connected
                </span>
                <span className="text-white font-mono font-bold">{connectedCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Pending Auth
                </span>
                <span className="text-white font-mono font-bold">{accounts.filter((a: any) => a.status === 'PENDING').length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-red-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" /> Error / Reauth
                </span>
                <span className="text-white font-mono font-bold">{accounts.filter((a: any) => a.status === 'ERROR' || a.status === 'REAUTH_REQUIRED').length}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5">
              <Link to="/accounts">
                <Button variant="outline" size="sm" className="w-full text-xs rounded-xl">
                  Manage Account Pool
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}