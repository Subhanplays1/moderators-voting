import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from './hooks/use-auth';
import { WorkspaceProvider } from './hooks/use-workspace';
import { VideoIntro } from './components/video-intro';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  // Always play on reload/refresh
  const [videoActive, setVideoActive] = useState<boolean>(true);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          {videoActive && (
            <VideoIntro onComplete={() => setVideoActive(false)} />
          )}
          <RouterProvider router={router} />
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}