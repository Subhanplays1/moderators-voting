import React, { useState } from 'react';
import { Settings as SettingsIcon, Shield, User, Building, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function Settings() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || 'Admin User');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.patch('/settings/profile', { name });
      setMessage('Profile updated successfully.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.post('/settings/change-password', { currentPassword, newPassword });
      setMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-fadeIn">
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
                <SettingsIcon size={12} className="text-purple-400" /> Preferences
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Platform Settings
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Configure profile attributes, security credentials, and workspace preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-white/5 bg-zinc-950/40">
            <CardHeader>
              <CardTitle className="text-base text-white">Personal Profile</CardTitle>
              <CardDescription>Update your personal information and display name</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={user?.email || 'admin@moderators.dev'}
                    disabled
                    className="opacity-60 cursor-not-allowed"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit">Save Changes</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-white/5 bg-zinc-950/40">
            <CardHeader>
              <CardTitle className="text-base text-white">Change Password</CardTitle>
              <CardDescription>Ensure your account uses a strong Argon2-hashed password</CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="curPass">Current Password</Label>
                  <Input
                    id="curPass"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPass">New Password</Label>
                  <Input
                    id="newPass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit">Update Password</Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="workspace">
          <Card className="border-white/5 bg-zinc-950/40">
            <CardHeader>
              <CardTitle className="text-base text-white">Organization Details</CardTitle>
              <CardDescription>Settings related to your current team tenant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="wsName">Workspace Name</Label>
                <Input id="wsName" defaultValue="Default Workspace" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wsSlug">Workspace Slug</Label>
                <Input id="wsSlug" defaultValue="default" disabled className="opacity-60" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Workspace</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}