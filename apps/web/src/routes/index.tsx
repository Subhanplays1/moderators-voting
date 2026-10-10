import { createBrowserRouter, Navigate } from 'react-router-dom';
import React, { Suspense } from 'react';

const ProtectedRoute = React.lazy(() => import('./protected-route').then(m => ({ default: m.ProtectedRoute })));
const AuthLayout = React.lazy(() => import('../layouts/auth-layout').then(m => ({ default: m.AuthLayout })));
const AppLayout = React.lazy(() => import('../layouts/app-layout').then(m => ({ default: m.AppLayout })));

const Login = React.lazy(() => import('../pages/auth/login').then(m => ({ default: m.Login })));
const Register = React.lazy(() => import('../pages/auth/register').then(m => ({ default: m.Register })));
const Dashboard = React.lazy(() => import('../pages/dashboard').then(m => ({ default: m.Dashboard })));
const StoryAnalyzer = React.lazy(() => import('../pages/story-analyzer').then(m => ({ default: m.StoryAnalyzer })));
const Sessions = React.lazy(() => import('../pages/sessions').then(m => ({ default: m.Sessions })));
const Accounts = React.lazy(() => import('../pages/accounts').then(m => ({ default: m.Accounts })));
const Team = React.lazy(() => import('../pages/team').then(m => ({ default: m.Team })));
const Logs = React.lazy(() => import('../pages/logs').then(m => ({ default: m.Logs })));
const Analytics = React.lazy(() => import('../pages/analytics').then(m => ({ default: m.Analytics })));
const Settings = React.lazy(() => import('../pages/settings').then(m => ({ default: m.Settings })));
const Admin = React.lazy(() => import('../pages/admin').then(m => ({ default: m.Admin })));

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-zinc-400">
    <div className="flex items-center gap-2">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
      <span className="text-sm font-medium">Loading platform...</span>
    </div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />
  },
  {
    element: <Suspense fallback={<LoadingFallback />}><AuthLayout /></Suspense>,
    children: [
      { path: '/login', element: <Suspense fallback={<LoadingFallback />}><Login /></Suspense> },
      { path: '/register', element: <Suspense fallback={<LoadingFallback />}><Register /></Suspense> },
    ]
  },
  {
    element: <Suspense fallback={<LoadingFallback />}><ProtectedRoute><AppLayout /></ProtectedRoute></Suspense>,
    children: [
      { path: '/dashboard', element: <Suspense fallback={<LoadingFallback />}><Dashboard /></Suspense> },
      { path: '/analyzer', element: <Suspense fallback={<LoadingFallback />}><StoryAnalyzer /></Suspense> },
      { path: '/sessions', element: <Suspense fallback={<LoadingFallback />}><Sessions /></Suspense> },
      { path: '/accounts', element: <Suspense fallback={<LoadingFallback />}><Accounts /></Suspense> },
      { path: '/team', element: <Suspense fallback={<LoadingFallback />}><Team /></Suspense> },
      { path: '/logs', element: <Suspense fallback={<LoadingFallback />}><Logs /></Suspense> },
      { path: '/analytics', element: <Suspense fallback={<LoadingFallback />}><Analytics /></Suspense> },
      { path: '/settings', element: <Suspense fallback={<LoadingFallback />}><Settings /></Suspense> },
      { path: '/admin', element: <Suspense fallback={<LoadingFallback />}><Admin /></Suspense> },
    ]
  }
]);