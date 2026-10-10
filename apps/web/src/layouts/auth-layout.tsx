import { Outlet } from 'react-router-dom';
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-white mb-8">MODERATORS</h1>
        <Outlet />
      </div>
    </div>
  );
}