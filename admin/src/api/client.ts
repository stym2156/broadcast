import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  // Render free-tier services sleep after 15 min of inactivity; first request after
  // wakeup can take 30-60s. 60s lets the cold start complete without the user seeing
  // a misleading "timeout" error.
  timeout: 60_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bca_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
