import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isPending, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/me');
        return res.data?.user || res.data;
      } catch (err: any) {
        if (err.response?.status === 401) return null;
        throw err;
      }
    },
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const res = await api.post('/auth/login', credentials);
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
      }
      return res.data;
    },
    onSuccess: () => refetch()
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
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

export const useAuth = () => useContext(AuthContext);