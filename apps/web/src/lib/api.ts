import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname.includes('vercel.app') 
    ? 'https://moderators-api.onrender.com' 
    : '');


export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect if a 401 is received, it's not the /auth/me check, and we currently have a token
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/me')) {
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      if (hadToken && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
