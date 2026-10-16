import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Trash2, 
  Wifi, 
  WifiOff, 
  Plus, 
  Search,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/utils';

interface Account {
  id: string;
  username: string;
  displayName?: string;
  status: 'CONNECTED' | 'PENDING' | 'DISCONNECTED' | 'REAUTH_REQUIRED' | 'ERROR';
  lastCheckedAt?: string;
  statusMessage?: string;
  createdAt: string;
}

export function Accounts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  // Instagram Direct Login Modal State
  const [isDirectLoginOpen, setIsDirectLoginOpen] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'PASSWORD' | 'SESSION'>('SESSION');
  const [sessionIdInput, setSessionIdInput] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorContext, setTwoFactorContext] = useState('');
  const [loginStep, setLoginStep] = useState<'LOGIN' | '2FA' | 'SUCCESS'>('LOGIN');
  const [loginNotice, setLoginNotice] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [sessionSuccessInfo, setSessionSuccessInfo] = useState<any>(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_success')) {
      alert('Official Instagram Account connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    } else if (params.get('oauth_error')) {
      alert(`Instagram Connection Error: ${params.get('oauth_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [queryClient]);

  const handleOfficialInstagramLogin = () => {
    setOauthLoading(true);
    const token = localStorage.getItem('token') || '';
    window.location.href = `https://moderators-api.onrender.com/api/accounts/oauth/instagram/authorize?token=${encodeURIComponent(token)}`;
  };


  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.get('/accounts');
      return res.data.accounts as Account[];
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await api.post('/accounts', { username });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setIsAddOpen(false);
      setNewUsername('');
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/accounts/${id}/connect`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/accounts/${id}/test`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/accounts/${id}/disconnect`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/accounts/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const handleBulkImport = async () => {
    try {
      const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
      const csvData = 'username,status\n' + lines.map(u => `${u.replace(/^@/, '')},pending`).join('\n');
      const blob = new Blob([csvData], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', blob, 'import.csv');

      const res = await api.post('/accounts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Import failed');
    }
  };

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await api.post('/accounts/login', {
        username: loginUsername,
        password: loginPassword,
      });

      if (res.data.status === 'SUCCESS') {
        setSessionSuccessInfo(res.data.account);
        setLoginStep('SUCCESS');
        setLoginNotice('');
        setLoginError('');
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      } else if (res.data.status === '2FA' || res.data.status === 'SECURE_CHALLENGE') {
        setTwoFactorContext(res.data.context || '');
        setLoginStep('2FA');
        setLoginNotice(res.data.message || 'Two-Factor Authentication required.');
        setLoginError('');
      } else {
        setLoginNotice('');
        setLoginError(res.data.message || 'Instagram Login failed.');
      }
    } catch (err: any) {
      setLoginNotice('');
      setLoginError(err.response?.data?.message || 'Authentication error.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await api.post('/accounts/verify-2fa', {
        username: loginUsername,
        code: twoFactorCode,
        context: twoFactorContext,
      });

      if (res.data.status === 'SUCCESS') {
        setSessionSuccessInfo(res.data.account);
        setLoginStep('SUCCESS');
        setLoginNotice('');
        setLoginError('');
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      } else {
        setLoginError(res.data.message || 'Invalid verification code.');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.message || '2FA Verification error.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSessionConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await api.post('/accounts/session-connect', {
        sessionId: sessionIdInput.trim(),
      });

      if (res.data.status === 'SUCCESS') {
        setSessionSuccessInfo(res.data.account);
        setLoginStep('SUCCESS');
        setLoginNotice('');
        setLoginError('');
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      } else {
        setLoginError(res.data.message || 'Session ID connection failed.');
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.message || 'Failed to connect using Session ID.');
    } finally {
      setLoginLoading(false);
    }
  };

  const resetDirectLoginModal = () => {
    setIsDirectLoginOpen(false);
    setLoginUsername('');
    setLoginPassword('');
    setSessionIdInput('');
    setTwoFactorCode('');
    setTwoFactorContext('');
    setLoginStep('LOGIN');
    setLoginNotice('');
    setLoginError('');
    setSessionSuccessInfo(null);
  };


  const accounts = data || [];
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch = acc.username.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || acc.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusVariant = (status: Account['status']) => {
    switch (status) {
      case 'CONNECTED': return 'success';
      case 'PENDING': return 'warning';
      case 'ERROR': return 'destructive';
      case 'REAUTH_REQUIRED': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Emblem */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-black/80 ring-1 ring-white/10 overflow-hidden shrink-0 shadow-lg">
              <img src="/logo.png" alt="Emblem" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase">
                  ACCOUNT POOL
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white font-serif uppercase mt-1">
                Authorized Instagram Accounts
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Manage and audit connected Instagram credentials participating in poll campaigns.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button 
              onClick={() => setIsDirectLoginOpen(true)}
              className="flex-1 sm:flex-initial text-xs sm:text-sm gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-pink-600/25 transition-all hover:scale-105"
            >
              <KeyRound size={15} /> Instagram Direct Login
            </Button>
            <Button 
              variant="outline"
              disabled={oauthLoading}
              onClick={handleOfficialInstagramLogin}
              className="flex-1 sm:flex-initial text-xs sm:text-sm gap-2 h-11 px-4 rounded-xl border-white/10 hover:bg-white/5 text-zinc-300"
            >
              {oauthLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
              ) : (
                <ExternalLink size={15} />
              )}
              Official Instagram Login
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsImportOpen(true)} 
              className="flex-1 sm:flex-initial text-xs sm:text-sm gap-2 h-11 px-4 rounded-xl border-white/10 hover:bg-white/5"
            >
              <Upload size={15} /> Bulk Import
            </Button>
            <Button 
              onClick={() => setIsAddOpen(true)} 
              className="flex-1 sm:flex-initial text-xs sm:text-sm gap-2 h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              <Plus size={15} /> Add Single
            </Button>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-950/60"
          />
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          {['ALL', 'CONNECTED', 'PENDING', 'ERROR', 'DISCONNECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <Card className="border-white/5 bg-zinc-950/40 backdrop-blur">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead>Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Added Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                    Loading accounts...
                  </TableCell>
                </TableRow>
              ) : filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                    <Users className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                    No Instagram accounts found. Click "Add Account" or "Bulk Import" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id} className="border-white/5">
                    <TableCell className="font-medium text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300">
                          {account.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">@{account.username}</div>
                          {account.displayName && (
                            <div className="text-xs text-zinc-500">{account.displayName}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(account.status)}>
                        {account.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {account.lastCheckedAt ? formatDate(account.lastCheckedAt) : 'Never'}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {formatDate(account.createdAt)}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {account.status !== 'CONNECTED' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => connectMutation.mutate(account.id)}
                          disabled={connectMutation.isPending}
                          className="text-xs h-8"
                        >
                          <Wifi size={13} className="mr-1" /> Connect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => testMutation.mutate(account.id)}
                          disabled={testMutation.isPending}
                          className="text-xs h-8 text-zinc-400 hover:text-white"
                          title="Test Connection"
                        >
                          <RefreshCw size={13} />
                        </Button>
                      )}
                      {account.status === 'CONNECTED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => disconnectMutation.mutate(account.id)}
                          className="text-xs h-8 text-zinc-400 hover:text-amber-400"
                          title="Disconnect"
                        >
                          <WifiOff size={13} />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(account.id)}
                        className="text-xs h-8 text-zinc-400 hover:text-red-400"
                        title="Remove Account"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Single Account Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Instagram Account</DialogTitle>
            <DialogDescription>
              Account will be initialized in PENDING state and requires standard authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="username">Instagram Username</Label>
              <Input
                id="username"
                placeholder="e.g. brand_campaign_01"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createAccountMutation.mutate(newUsername)}
              disabled={!newUsername || createAccountMutation.isPending}
            >
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Accounts</DialogTitle>
            <DialogDescription>
              Paste accounts or upload records. One username per line. No passwords accepted.
            </DialogDescription>
          </DialogHeader>
          
          {importResult ? (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-3 bg-zinc-900 rounded-lg border border-white/5">
                  <div className="text-xl font-bold text-white">{importResult.total}</div>
                  <div className="text-xs text-zinc-400">Total</div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <div className="text-xl font-bold text-emerald-400">{importResult.valid}</div>
                  <div className="text-xs text-zinc-400">Valid</div>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <div className="text-xl font-bold text-amber-400">{importResult.duplicates}</div>
                  <div className="text-xs text-zinc-400">Duplicates</div>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="text-xl font-bold text-red-400">{importResult.invalid}</div>
                  <div className="text-xs text-zinc-400">Invalid</div>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                All accounts successfully added with <span className="text-amber-400 font-semibold">PENDING</span> status until authorization.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="usernames">Usernames (one per line)</Label>
                <textarea
                  id="usernames"
                  rows={6}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="creator_alpha&#10;creator_beta&#10;creator_gamma"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {importResult ? (
              <Button onClick={() => { setIsImportOpen(false); setImportResult(null); setImportText(''); }}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button>
                <Button onClick={handleBulkImport} disabled={!importText.trim()}>
                  Start Import
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instagram Direct Login Dialog (xr0ni Login System) */}
      <Dialog open={isDirectLoginOpen} onOpenChange={resetDirectLoginModal}>
        <DialogContent className="max-w-md bg-zinc-950 border-white/10 text-white shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <KeyRound size={16} />
              </div>
              <DialogTitle className="text-lg font-bold">
                {loginStep === 'LOGIN' && 'Instagram Direct API Login'}
                {loginStep === '2FA' && 'Instagram 2-Factor Authentication'}
                {loginStep === 'SUCCESS' && 'Session Extraction Complete'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-zinc-400 text-xs">
              {loginStep === 'LOGIN' && 'Sign in using Instagram credentials to extract session tokens and auto-connect for voting.'}
              {loginStep === '2FA' && 'Instagram requested a security verification code sent to your authenticator app or mobile device.'}
              {loginStep === 'SUCCESS' && 'Account authenticated successfully with an active session token.'}
            </DialogDescription>
          </DialogHeader>

          {loginNotice && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-start gap-2">
              <KeyRound size={15} className="shrink-0 mt-0.5 text-blue-400" />
              <span>{loginNotice}</span>
            </div>
          )}

          {loginError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {loginStep === 'LOGIN' && (
            <div className="space-y-4 py-2">
              {/* Method Switcher Tabs */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900 border border-white/5">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('SESSION'); setLoginError(''); }}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    loginMethod === 'SESSION'
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ⚡ Session Cookie (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('PASSWORD'); setLoginError(''); }}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    loginMethod === 'PASSWORD'
                      ? 'bg-zinc-800 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🔑 Direct Password
                </button>
              </div>

              {loginMethod === 'SESSION' ? (
                <form onSubmit={handleSessionConnect} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 space-y-2">
                    <p className="font-semibold flex items-center gap-1.5 text-purple-300">
                      💡 100% Reliable & Bypasses Instagram Security Blocks
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-zinc-300">
                      <li>Open <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="underline text-purple-400">instagram.com</a> in your browser where you are logged in.</li>
                      <li>Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-white/10 text-[10px]">F12</kbd> (Inspect) &rarr; Go to <strong>Application</strong> (or Storage) &rarr; <strong>Cookies</strong> &rarr; <strong>instagram.com</strong>.</li>
                      <li>Find and copy the value of the cookie named <code className="text-pink-300 font-mono font-bold">sessionid</code>.</li>
                    </ol>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ig-sessionid" className="text-xs text-zinc-300">
                      Instagram <code className="text-pink-400 font-mono">sessionid</code> Cookie Value
                    </Label>
                    <textarea
                      id="ig-sessionid"
                      rows={3}
                      placeholder="e.g. 7856421948%3AmYVbN9... or paste full cookie string"
                      value={sessionIdInput}
                      onChange={(e) => setSessionIdInput(e.target.value)}
                      required
                      className="w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900/60 border border-white/5 text-[11px] text-zinc-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                      <Lock size={12} className="text-pink-400" /> Secure Token Storage
                    </div>
                    <p>
                      Your session token is encrypted with AES-256-GCM and stored only for voting automation in your workspace.
                    </p>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={resetDirectLoginModal}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loginLoading || !sessionIdInput.trim()}
                      className="bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold"
                    >
                      {loginLoading ? 'Verifying Session...' : 'Connect With Session ID'}
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                <form onSubmit={handleDirectLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ig-username" className="text-xs text-zinc-300">Instagram Username, Email or Phone</Label>
                    <Input
                      id="ig-username"
                      placeholder="e.g. itx_subhan.____ or email/phone"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      required
                      className="h-10 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ig-password" className="text-xs text-zinc-300">Instagram Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{showPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="ig-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-10 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500 pr-10"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900/60 border border-white/5 text-[11px] text-zinc-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                      <Lock size={12} className="text-pink-400" /> End-to-End Encrypted
                    </div>
                    <p>
                      Tokens are stored encrypted with AES-256-GCM. Passwords are never saved to database.
                    </p>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={resetDirectLoginModal}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loginLoading || !loginUsername || !loginPassword}
                      className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold"
                    >
                      {loginLoading ? 'Authenticating...' : 'Sign In & Extract Session'}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </div>
          )}

          {loginStep === '2FA' && (
            <form onSubmit={handleVerify2FA} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="twofa-code" className="text-xs text-zinc-300">Security / 2FA Code</Label>
                <Input
                  id="twofa-code"
                  placeholder="Enter 6-digit code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  required
                  autoFocus
                  className="h-10 bg-zinc-900 border-white/10 text-white text-center font-mono text-lg tracking-widest placeholder:text-zinc-500"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setLoginStep('LOGIN')}>
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={loginLoading || !twoFactorCode}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {loginLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {loginStep === 'SUCCESS' && (
            <div className="space-y-4 py-2 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  @{sessionSuccessInfo?.username || loginUsername} Connected
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Session credentials successfully extracted and saved into your active voting pool.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button 
                  onClick={resetDirectLoginModal}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}