import React, { useState } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Logo } from '../../components/logo';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-white/10 bg-zinc-950/80 backdrop-blur-2xl shadow-2xl rounded-2xl mx-auto w-full max-w-sm sm:max-w-md">
      <CardHeader className="text-center space-y-2 pt-8">
        <div className="flex justify-center mb-3">
          <Logo size={72} />
        </div>
        <CardTitle className="text-2xl font-black tracking-widest text-white font-serif uppercase">MODERATORS</CardTitle>
        <CardDescription className="text-pink-300/80 font-mono text-[11px] tracking-widest uppercase">
          ATTACKER TEAM ACCESS PORTAL
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-zinc-300">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="moderator@example.com"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="h-11 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-xs text-zinc-300">Password</Label>
            </div>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="h-11 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500 rounded-xl"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 px-6 pb-8">
          <Button type="submit" className="w-full h-11 rounded-xl font-semibold shadow-lg shadow-blue-600/20" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
          <div className="text-xs text-zinc-400 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 font-semibold hover:underline">
              Create account
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}