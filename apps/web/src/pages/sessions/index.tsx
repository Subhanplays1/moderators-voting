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
  Sparkles,
  Plus,
  Trash2,
  Users
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
    options: any;
  };
  createdAt: string;
}

export function Sessions() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [actionError, setActionError] = useState<string | null>(null);

  // Direct Create Campaign Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [optionA, setOptionA] = useState('Option A');
  const [optionB, setOptionB] = useState('Option B');
  const [selectedOption, setSelectedOption] = useState('Option A');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
      setActionError(null);
      await api.post(`/sessions/${id}/start`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to start session');
    }
  });

  const stopMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/sessions/${id}/stop`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const restartMutation = useMutation({
    mutationFn: async (id: string) => {
      setActionError(null);
      await api.post(`/sessions/${id}/restart`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to restart session');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sessions/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const handleCreateDirectCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      const pollRes = await api.post('/stories/manual', {
        question: pollQuestion.trim() || 'Custom Story Poll',
        options: [optionA.trim() || 'Option A', optionB.trim() || 'Option B'],
      });

      const poll = pollRes.data?.poll;
      if (!poll?.id) throw new Error('Failed to register poll');

      await api.post('/sessions', {
        pollId: poll.id,
        selectedOption: selectedOption.trim() || optionA.trim() || 'Option A',
        name: campaignName.trim() || `Campaign: ${(pollQuestion || 'Story Poll').slice(0, 25)}`,
      });

      setIsCreateOpen(false);
      setCampaignName('');
      setPollQuestion('');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to create campaign session');
    } finally {
      setCreateLoading(false);
    }
  };

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
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-purple-900/30"
            >
              <Plus size={16} /> New Campaign
            </Button>
            <Link to="/analyzer">
              <Button variant="outline" className="gap-2 border-white/10 text-zinc-300 hover:text-white">
                <Sparkles size={16} /> Via Story Analyzer
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between gap-3 animate-shake">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{actionError}</span>
          </div>
          <Link to="/accounts" className="underline font-semibold text-red-300 hover:text-white shrink-0">
            Go to Accounts &rarr;
          </Link>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'RUNNING', 'DRAFT', 'COMPLETED', 'FAILED', 'CANCELLED'].map((tab) => (
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
                          className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white font-medium"
                        >
                          <Play size={14} /> Start Campaign
                        </Button>
                      ) : session.status === 'RUNNING' ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => stopMutation.mutate(session.id)}
                          disabled={stopMutation.isPending}
                          className="gap-1.5 text-xs font-medium"
                        >
                          <Square size={14} /> Stop
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => restartMutation.mutate(session.id)}
                          disabled={restartMutation.isPending}
                          className="gap-1.5 text-xs text-zinc-300 border-white/10 hover:text-white hover:bg-white/5"
                        >
                          <RotateCcw size={13} /> Restart
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this campaign?')) {
                            deleteMutation.mutate(session.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-zinc-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>

                  {session.status === 'DRAFT' && session.totalAccounts === 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Users size={14} className="text-purple-400 shrink-0" />
                        Campaign created as DRAFT. Connect at least 1 account via Direct Login or Session ID in Accounts to run voting.
                      </span>
                      <Link to="/accounts" className="underline font-semibold text-purple-200 hover:text-white shrink-0">
                        Connect Accounts &rarr;
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Direct Campaign Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-white/10 text-white shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Vote size={18} />
              </div>
              <DialogTitle className="text-lg font-bold">Create New Campaign</DialogTitle>
            </div>
            <DialogDescription className="text-zinc-400 text-xs">
              Configure a story poll campaign. Campaigns start in DRAFT mode and vote using your connected voting pool.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{createError}</span>
            </div>
          )}

          <form onSubmit={handleCreateDirectCampaign} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="camp-name" className="text-xs text-zinc-300">Campaign Name</Label>
              <Input
                id="camp-name"
                placeholder="e.g. Summer Promo Story Poll"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="h-10 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="poll-q" className="text-xs text-zinc-300">Poll Question</Label>
              <Input
                id="poll-q"
                placeholder="e.g. Which design is your favorite?"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                required
                className="h-10 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="opt-a" className="text-xs text-zinc-300">Option 1</Label>
                <Input
                  id="opt-a"
                  placeholder="Option A"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  required
                  className="h-10 bg-zinc-900 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="opt-b" className="text-xs text-zinc-300">Option 2</Label>
                <Input
                  id="opt-b"
                  placeholder="Option B"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  required
                  className="h-10 bg-zinc-900 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Vote For Target Option</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOption(optionA)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    selectedOption === optionA
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                      : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {optionA || 'Option A'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOption(optionB)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    selectedOption === optionB
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                      : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {optionB || 'Option B'}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createLoading || !pollQuestion.trim()}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold"
              >
                {createLoading ? 'Creating...' : 'Create Campaign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}