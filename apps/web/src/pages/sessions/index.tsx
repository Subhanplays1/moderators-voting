import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Vote,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDate } from '@/lib/utils';

interface VotingSession {
  id: string;
  name?: string;
  selectedOption: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalAccounts: number;
  completed: number;
  failed: number;
  poll?: {
    question: string;
    options: string[];
  };
  createdAt: string;
}

export function Sessions() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get('/sessions');
      return res.data.sessions as VotingSession[];
    },
    refetchInterval: 3000, // Poll every 3 seconds for active sessions
  });

  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/sessions/${id}/start`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const stopMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/sessions/${id}/stop`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const sessions = data || [];
  const filteredSessions = sessions.filter((s) => {
    if (filter === 'ALL') return true;
    return s.status === filter;
  });

  const statusVariant = (status: VotingSession['status']) => {
    switch (status) {
      case 'RUNNING': return 'default';
      case 'COMPLETED': return 'success';
      case 'FAILED': return 'destructive';
      case 'PAUSED': return 'warning';
      default: return 'secondary';
    }
  };

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
                <Vote size={12} className="text-purple-400" /> Live Campaigns
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Voting Sessions
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Monitor and orchestrate verified Instagram Story poll voting operations
              </p>
            </div>
          </div>
          <Link to="/analyzer">
            <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold shadow-lg shadow-purple-900/30">
              <Sparkles size={16} /> New Session via Analyzer
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'RUNNING', 'COMPLETED', 'DRAFT', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              filter === tab
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/5 hover:border-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-zinc-500">Loading voting sessions...</div>
      ) : filteredSessions.length === 0 ? (
        <Card className="border-white/5 bg-zinc-950/40 text-center py-12">
          <CardContent>
            <Clock className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">No voting sessions found.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Use the Story Analyzer to detect a poll and initialize a session.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSessions.map((session) => {
            const progress = session.totalAccounts > 0 
              ? Math.round(((session.completed + session.failed) / session.totalAccounts) * 100) 
              : 0;

            return (
              <Card key={session.id} className="glass-card hover:border-purple-500/30 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-white text-base">
                          {session.name || `Session #${session.id.slice(0, 8)}`}
                        </span>
                        <Badge variant={statusVariant(session.status)}>
                          {session.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-400 truncate">
                        Poll Question: <span className="text-zinc-200 font-medium">{session.poll?.question || 'Which design should we use?'}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 pt-1">
                        <span>Selected Option: <strong className="text-purple-400 font-semibold">{session.selectedOption}</strong></span>
                        <span className="hidden sm:inline">•</span>
                        <span>Total Accounts: {session.totalAccounts}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Created: {formatDate(session.createdAt)}</span>
                      </div>
                    </div>

                    {/* Progress Bar Center */}
                    <div className="w-full lg:w-72 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Progress</span>
                        <span className="text-zinc-200 font-semibold">{progress}%</span>
                      </div>
                      <Progress value={progress} />
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span className="text-emerald-400 font-medium">Completed: {session.completed}</span>
                        <span className="text-red-400 font-medium">Failed: {session.failed}</span>
                        <span>Pending: {Math.max(0, session.totalAccounts - session.completed - session.failed)}</span>
                      </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-2 self-end lg:self-center">
                      {session.status === 'DRAFT' || session.status === 'PAUSED' ? (
                        <Button
                          size="sm"
                          onClick={() => startMutation.mutate(session.id)}
                          disabled={startMutation.isPending}
                          className="gap-1.5 text-xs"
                        >
                          <Play size={14} /> Start Session
                        </Button>
                      ) : session.status === 'RUNNING' ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => stopMutation.mutate(session.id)}
                          disabled={stopMutation.isPending}
                          className="gap-1.5 text-xs"
                        >
                          <Square size={14} /> Stop
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs" disabled>
                          Finished
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}