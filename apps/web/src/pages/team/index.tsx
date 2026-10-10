import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  UserCheck, 
  Mail, 
  Shield, 
  Trash2, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle
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

interface TeamMember {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'VIEWER';
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function Team() {
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MODERATOR' | 'VIEWER'>('MODERATOR');

  const { data: members, isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await api.get('/team');
      return res.data.members as TeamMember[];
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: { email: string; role: string }) => {
      const res = await api.post('/team/invite', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setIsInviteOpen(false);
      setEmail('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/team/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  });

  const roleVariant = (r: TeamMember['role']) => {
    switch (r) {
      case 'OWNER': return 'default';
      case 'ADMIN': return 'warning';
      case 'MODERATOR': return 'success';
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
                <Shield size={12} className="text-purple-400" /> Access Control
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Team & Moderators
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Manage workspace members, administrative roles, and system invitations
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setIsInviteOpen(true)} 
            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold shadow-lg shadow-purple-900/30"
          >
            <Plus size={16} /> Invite Member
          </Button>
        </div>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-zinc-500">
                    Loading team members...
                  </TableCell>
                </TableRow>
              ) : (members || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-zinc-500">
                    No team members found.
                  </TableCell>
                </TableRow>
              ) : (
                (members || []).map((m) => (
                  <TableRow key={m.id} className="border-white/5">
                    <TableCell className="font-medium text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                          {m.user.name?.[0] || 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{m.user.name}</div>
                          <div className="text-xs text-zinc-500">{m.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleVariant(m.role)}>{m.role}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">
                      {formatDate(m.joinedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {m.role !== 'OWNER' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeMutation.mutate(m.id)}
                          className="text-xs text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              They will receive access to this workspace according to the assigned role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
              >
                <option value="ADMIN">ADMIN — Full management permissions</option>
                <option value="MODERATOR">MODERATOR — Story analysis & session view</option>
                <option value="VIEWER">VIEWER — Read-only observation</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => inviteMutation.mutate({ email, role })}
              disabled={!email || inviteMutation.isPending}
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}