/**
 * Admin → backend client. Same `adminApi` export name as before but every method now
 * hits the real REST API. Admin reuses the same `/api/auth/login` route as the
 * frontend — the backend enforces admin role via JWT.
 */
import { api } from './client';
import type { AdminBroadcast, AdminPlan, AdminSubscription, AdminUser } from '../types';

const TOKEN_KEY = 'bca_token';
const USER_KEY = 'bca_user';

interface AdminAuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface AdminStats {
  users: number;
  activeUsers: number;
  broadcasts: number;
  sentToday: number;
  activeSubscriptions: number;
  mrr: number;
  revenueTotal: number;
  revenueWeek: Array<{ day: string; revenue: number }>;
  planDistribution: Array<{ name: string; value: number }>;
  recentUsers: AdminUser[];
  recentBroadcasts: AdminBroadcast[];
}

export const adminApi = {
  async login(email: string, password: string): Promise<AdminAuthUser> {
    const { data } = await api.post<{ ok: boolean; token: string; user: AdminAuthUser }>(
      '/auth/login',
      { email, password }
    );
    if (data.user.role !== 'admin') {
      throw new Error('บัญชีนี้ไม่ใช่ผู้ดูแลระบบ');
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getUser(): AdminAuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminAuthUser) : null;
  },

  async getStats(): Promise<AdminStats> {
    const { data } = await api.get<{ ok: boolean; stats: AdminStats }>('/admin/stats');
    return data.stats;
  },

  async getUsers(): Promise<AdminUser[]> {
    const { data } = await api.get<{ ok: boolean; users: AdminUser[] }>('/admin/users');
    return data.users;
  },

  async toggleUserStatus(id: string): Promise<AdminUser | undefined> {
    // Need to fetch current state first since backend PATCH is a generic update.
    const list = await this.getUsers();
    const current = list.find((u) => u.id === id);
    if (!current) return undefined;
    const nextStatus = current.status === 'active' ? 'suspended' : 'active';
    const { data } = await api.patch<{ ok: boolean; user: AdminUser }>(`/admin/users/${id}`, {
      status: nextStatus,
    });
    return data.user;
  },

  async getBroadcasts(): Promise<AdminBroadcast[]> {
    const { data } = await api.get<{ ok: boolean; broadcasts: AdminBroadcast[] }>('/admin/broadcasts');
    return data.broadcasts;
  },

  async getSubscriptions(): Promise<AdminSubscription[]> {
    const { data } = await api.get<{ ok: boolean; subscriptions: AdminSubscription[] }>(
      '/admin/subscriptions'
    );
    return data.subscriptions;
  },

  async getPlans(): Promise<AdminPlan[]> {
    const { data } = await api.get<{ ok: boolean; plans: AdminPlan[] }>('/admin/plans');
    return data.plans;
  },

  async updatePlan(id: string, patch: Partial<AdminPlan>): Promise<AdminPlan | undefined> {
    const { data } = await api.patch<{ ok: boolean; plan: AdminPlan }>(`/admin/plans/${id}`, patch);
    return data.plan;
  },
};
