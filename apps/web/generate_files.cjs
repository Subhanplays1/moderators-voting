const fs = require('fs');
const path = require('path');

const baseDir = 'd:/Documents/antigravity/voting/apps/web';

const files = {
  // UI Components
  'src/components/ui/button.tsx': `import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700",
        secondary: "bg-white/10 text-white hover:bg-white/20",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-white/10 bg-transparent hover:bg-white/5 text-white",
        ghost: "hover:bg-white/5 text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: { default: "h-10 px-4 py-2", sm: "h-9 rounded-md px-3", lg: "h-11 rounded-md px-8", icon: "h-10 w-10" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
export { Button, buttonVariants };`,

  'src/components/ui/input.tsx': `import * as React from "react";
import { cn } from "@/lib/utils";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return <input type={type} className={cn("flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props} />;
});
Input.displayName = "Input";
export { Input };`,

  'src/components/ui/label.tsx': `import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("text-sm font-medium leading-none text-zinc-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;
export { Label };`,

  'src/components/ui/card.tsx': `import * as React from "react";
import { cn } from "@/lib/utils";
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border border-white/5 bg-white/[0.02] text-white shadow-sm", className)} {...props} />
));
Card.displayName = "Card";
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />);
CardHeader.displayName = "CardHeader";
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />);
CardTitle.displayName = "CardTitle";
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-zinc-400", className)} {...props} />);
CardDescription.displayName = "CardDescription";
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />);
CardContent.displayName = "CardContent";
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />);
CardFooter.displayName = "CardFooter";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };`,

  // Core App logic & entry point
  'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,

  'src/App.tsx': `import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from './hooks/use-auth';
import { WorkspaceProvider } from './hooks/use-workspace';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          <RouterProvider router={router} />
        </WorkspaceProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}`,

  'src/routes/index.tsx': `import { createBrowserRouter, Navigate } from 'react-router-dom';
import React, { Suspense } from 'react';

const ProtectedRoute = React.lazy(() => import('./protected-route').then(m => ({ default: m.ProtectedRoute })));
const AuthLayout = React.lazy(() => import('../layouts/auth-layout').then(m => ({ default: m.AuthLayout })));
const AppLayout = React.lazy(() => import('../layouts/app-layout').then(m => ({ default: m.AppLayout })));

const Login = React.lazy(() => import('../pages/auth/login').then(m => ({ default: m.Login })));
const Dashboard = React.lazy(() => import('../pages/dashboard').then(m => ({ default: m.Dashboard })));
const StoryAnalyzer = React.lazy(() => import('../pages/story-analyzer').then(m => ({ default: m.StoryAnalyzer })));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />
  },
  {
    element: <Suspense fallback={<div>Loading...</div>}><AuthLayout /></Suspense>,
    children: [
      { path: '/login', element: <Suspense fallback={<div>Loading...</div>}><Login /></Suspense> },
    ]
  },
  {
    element: <Suspense fallback={<div>Loading...</div>}><ProtectedRoute><AppLayout /></ProtectedRoute></Suspense>,
    children: [
      { path: '/dashboard', element: <Suspense fallback={<div>Loading...</div>}><Dashboard /></Suspense> },
      { path: '/analyzer', element: <Suspense fallback={<div>Loading...</div>}><StoryAnalyzer /></Suspense> },
    ]
  }
]);`,

  'src/routes/protected-route.tsx': `import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

export function ProtectedRoute() {
  const { isAuthenticated, isPending } = useAuth();
  if (isPending) return <div className="min-h-screen flex items-center justify-center bg-background text-white">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}`,

  'src/hooks/use-auth.tsx': `import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isPending, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      await api.post('/auth/login', credentials);
    },
    onSuccess: () => refetch()
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => refetch()
  });

  const value = {
    user,
    isAuthenticated: !!user,
    isPending,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);`,

  'src/hooks/use-workspace.tsx': `import React, { createContext, useContext, useState } from 'react';
const WorkspaceContext = createContext<any>(null);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState(null);
  return <WorkspaceContext.Provider value={{ workspace, setWorkspace }}>{children}</WorkspaceContext.Provider>;
}
export const useWorkspace = () => useContext(WorkspaceContext);`,

  'src/layouts/auth-layout.tsx': `import { Outlet } from 'react-router-dom';
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-white mb-8">MODERATORS</h1>
        <Outlet />
      </div>
    </div>
  );
}`,

  'src/layouts/app-layout.tsx': `import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/sidebar';
export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 p-8">
        <Outlet />
      </div>
    </div>
  );
}`,

  'src/components/sidebar.tsx': `import { Link } from 'react-router-dom';
import { LayoutDashboard, Search, Play, Users, Settings } from 'lucide-react';
export function Sidebar() {
  return (
    <div className="w-64 bg-surface border-r border-white/5 fixed inset-y-0 left-0 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white tracking-widest">MODERATORS</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><LayoutDashboard size={20} /> Dashboard</Link>
        <Link to="/analyzer" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><Search size={20} /> Analyzer</Link>
        <Link to="/sessions" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><Play size={20} /> Sessions</Link>
      </nav>
    </div>
  );
}`,

  'src/pages/auth/login.tsx': `import { useState } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-center">Welcome Back</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">Sign In</Button>
        </CardFooter>
      </form>
    </Card>
  );
}`,

  'src/pages/dashboard/index.tsx': `import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
export function Dashboard() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-zinc-400">Overview of your operations</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`,

  'src/pages/story-analyzer/index.tsx': `import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
export function StoryAnalyzer() {
  const [url, setUrl] = useState('');
  return (
    <div className="space-y-6 text-white max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Story Analyzer</h1>
        <p className="text-zinc-400">Extract poll information from Instagram stories</p>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4">
            <Input placeholder="Enter Instagram Story URL..." value={url} onChange={e => setUrl(e.target.value)} className="flex-1" />
            <Button>Analyze</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}`,
};

const createFiles = () => {
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(baseDir, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Created:', filePath);
  }
};

createFiles();
