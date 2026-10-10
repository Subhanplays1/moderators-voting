import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, ShieldAlert, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

interface LogEntry {
  id: string;
  action: string;
  target?: string;
  status: string;
  ip?: string;
  metadata?: any;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

export function Logs() {
  const [search, setSearch] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      try {
        const res = await api.get('/logs');
        return res.data.logs as LogEntry[];
      } catch {
        return [];
      }
    },
  });

  const list = logs || [];
  const filtered = list.filter((l) => {
    return (
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.user?.email?.toLowerCase().includes(search.toLowerCase())
    );
  });

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
                <FileText size={12} className="text-purple-400" /> Audit Trail
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Audit & Activity Logs
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Immutable security trail for all authentication, session operations, and administrative events
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-black/60 border-white/10 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                    Loading audit trail...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                    No activity logs found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow key={log.id} className="border-white/5">
                    <TableCell className="font-medium text-white">
                      <span className="font-mono text-xs bg-zinc-900 px-2 py-1 rounded border border-white/5">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-300">
                      {log.user ? `${log.user.name} (${log.user.email})` : 'SYSTEM'}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {log.target || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'success' : 'destructive'}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-zinc-500">
                      {formatDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}