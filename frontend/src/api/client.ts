import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  // Render free-tier services sleep after 15 min of inactivity. The first request after
  // wakeup can take 30-60s while the container cold-starts and Mongoose reconnects to
  // Atlas. 60s gives that window without leaving real-user requests hanging too long.
  timeout: 60_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
