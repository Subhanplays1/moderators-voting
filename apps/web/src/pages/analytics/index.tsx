import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  XCircle, 
  PieChart as PieChartIcon 
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function Analytics() {
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.get('/accounts');
      return res.data.accounts || [];
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get('/sessions');
      return res.data.sessions || [];
    },
  });

  const accountList = accounts || [];
  const sessionList = sessions || [];

  const totalVotesCast = sessionList.reduce((acc: number, s: any) => acc + (s.completed || 0), 0);
  const totalFailedVotes = sessionList.reduce((acc: number, s: any) => acc + (s.failed || 0), 0);
  const successRatio = (totalVotesCast + totalFailedVotes) > 0 
    ? ((totalVotesCast / (totalVotesCast + totalFailedVotes)) * 100).toFixed(1)
    : '100.0';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-black/80 ring-2 ring-white/10 shadow-2xl shrink-0 group">
              <img 
                src="/logo.png" 
                alt="Emblem" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[11px] font-semibold text-purple-300 tracking-wider uppercase mb-1">
                <BarChart3 size={12} className="text-purple-400" /> Metrics & Telemetry
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Platform Analytics
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Campaign aggregate statistics, poll conversion rates, and account activity metrics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Aggregates */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-zinc-400">Total Votes Executed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalVotesCast}</div>
            <p className="text-xs text-emerald-400 mt-1">Via verified authorized accounts</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-950/40 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-zinc-400">Vote Delivery Success</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{successRatio}%</div>
            <p className="text-xs text-zinc-500 mt-1">{totalFailedVotes} failed submissions</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-950/40 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-zinc-400">Total Campaign Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{sessionList.length}</div>
            <p className="text-xs text-blue-400 mt-1">{sessionList.filter((s: any) => s.status === 'RUNNING').length} active currently</p>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-950/40 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-zinc-400">Managed Instagram Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{accountList.length}</div>
            <p className="text-xs text-zinc-400 mt-1">{accountList.filter((a: any) => a.status === 'CONNECTED').length} authenticated</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Breakdown Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-white/5 bg-zinc-950/40">
          <CardHeader>
            <CardTitle className="text-base text-white">Campaign Distribution</CardTitle>
            <CardDescription>Session volume classified by status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['COMPLETED', 'RUNNING', 'DRAFT', 'FAILED'].map((st) => {
              const count = sessionList.filter((s: any) => s.status === st).length;
              const percent = sessionList.length > 0 ? (count / sessionList.length) * 100 : 0;
              return (
                <div key={st} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">{st}</span>
                    <span className="text-zinc-200 font-semibold">{count} ({percent.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${st === 'COMPLETED' ? 'bg-emerald-500' : st === 'RUNNING' ? 'bg-blue-500' : st === 'FAILED' ? 'bg-red-500' : 'bg-zinc-600'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-zinc-950/40">
          <CardHeader>
            <CardTitle className="text-base text-white">Account Status Metrics</CardTitle>
            <CardDescription>Health of the current account inventory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['CONNECTED', 'PENDING', 'ERROR', 'DISCONNECTED'].map((st) => {
              const count = accountList.filter((a: any) => a.status === st).length;
              const percent = accountList.length > 0 ? (count / accountList.length) * 100 : 0;
              return (
                <div key={st} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">{st}</span>
                    <span className="text-zinc-200 font-semibold">{count} ({percent.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${st === 'CONNECTED' ? 'bg-emerald-500' : st === 'PENDING' ? 'bg-amber-500' : st === 'ERROR' ? 'bg-red-500' : 'bg-zinc-700'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}