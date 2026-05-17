/**
 * Frontend → backend client. The export is still named `mockApi` so existing call sites
 * keep working — but every method now hits the real REST API via axios.
 *
 * `VITE_API_URL` defaults to http://localhost:4000/api (see api/client.ts).
 */
import { api } from './client';
import type {
  Broadcast,
  ChatMessage,
  Conversation,
  Customer,
  FbPage,
  Plan,
  QuickReply,
  Subscription,
  User,
} from '../types';

const TOKEN_KEY = 'bc_token';
const USER_KEY = 'bc_user';

interface AuthResponse {
  ok: boolean;
  token: string;
  user: User;
}

interface DashboardStats {
  totalSent: number;
  pages: number;
  customers: number;
  activeBroadcasts: number;
  unreadMessages: number;
  weekly: Array<{ day: string; sent: number }>;
  recent: Broadcast[];
}

function persistAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export const mockApi = {
  // ───────────────────────── Auth ─────────────────────────

  async login(email: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    persistAuth(data.token, data.user);
    return { user: data.user, token: data.token };
  },

  async loginWithFacebook() {
    const { data } = await api.get<{ ok: boolean; url: string; state: string }>('/oauth/facebook/start');
    if (data.url) {
      window.location.href = data.url;
      // Resolve to keep the calling code happy; we won't reach the await below in practice.
      return new Promise<{ user: User; token: string }>(() => {});
    }
    throw new Error('Facebook OAuth not configured on server');
  },

  async register(name: string, email: string, password: string) {
    const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password });
    persistAuth(data.token, data.user);
    return { user: data.user, token: data.token };
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  },

  // ───────────────────────── Pages / Channels ─────────────────────────

  async getPages(): Promise<FbPage[]> {
    const { data } = await api.get<{ ok: boolean; pages: FbPage[] }>('/pages');
    return data.pages;
  },

  async addPage(input: { name: string; channel: FbPage['channel']; phoneNumber?: string }): Promise<FbPage> {
    const { data } = await api.post<{ ok: boolean; page: FbPage }>('/pages', input);
    return data.page;
  },

  async removePage(id: string): Promise<void> {
    await api.delete(`/pages/${id}`);
  },

  // ───────────────────────── Customers ─────────────────────────

  async getCustomers(filter?: { tag?: string; pageId?: string }): Promise<Customer[]> {
    const params: Record<string, string> = {};
    if (filter?.tag) params.tag = filter.tag;
    if (filter?.pageId) params.page = filter.pageId;
    const { data } = await api.get<{ ok: boolean; customers: Customer[] }>('/customers', { params });
    return data.customers;
  },

  // ───────────────────────── Broadcasts ─────────────────────────

  async getBroadcasts(): Promise<Broadcast[]> {
    const { data } = await api.get<{ ok: boolean; broadcasts: Broadcast[] }>('/broadcasts');
    return data.broadcasts;
  },

  async createBroadcast(input: {
    title: string;
    message: string;
    pages: string[];
    targetTags: string[];
    scheduledAt?: string | null;
  }): Promise<Broadcast> {
    const { data } = await api.post<{ ok: boolean; broadcast: Broadcast }>('/broadcasts', input);
    return data.broadcast;
  },

  // ───────────────────────── Subscriptions ─────────────────────────

  async getPlans(): Promise<Plan[]> {
    const { data } = await api.get<{ ok: boolean; plans: Plan[] }>('/subscriptions/plans');
    return data.plans;
  },

  async getSubscriptions(): Promise<{ active: Subscription | null; history: Subscription[] }> {
    const { data } = await api.get<{ ok: boolean; active: Subscription | null; history: Subscription[] }>(
      '/subscriptions/me'
    );
    return { active: data.active, history: data.history };
  },

  async subscribe(planId: string): Promise<Subscription> {
    const { data } = await api.post<{ ok: boolean; subscription: Subscription }>('/subscriptions/subscribe', {
      planId,
    });
    return data.subscription;
  },

  // ───────────────────────── Dashboard ─────────────────────────

  async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await api.get<{ ok: boolean; stats: DashboardStats }>('/stats/user-dashboard');
    return data.stats;
  },

  // ───────────────────────── Inbox ─────────────────────────

  async getConversations(filter?: {
    pageId?: string;
    channel?: Conversation['channel'];
    status?: Conversation['status'];
    tag?: string;
    q?: string;
  }): Promise<Conversation[]> {
    const params: Record<string, string> = {};
    if (filter?.pageId) params.pageId = filter.pageId;
    if (filter?.channel) params.channel = filter.channel;
    if (filter?.status) params.status = filter.status;
    if (filter?.tag) params.tag = filter.tag;
    if (filter?.q) params.q = filter.q;
    const { data } = await api.get<{ ok: boolean; conversations: Conversation[] }>('/inbox/conversations', {
      params,
    });
    return data.conversations;
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const { data } = await api.get<{ ok: boolean; messages: ChatMessage[] }>(
      `/inbox/conversations/${conversationId}/messages`
    );
    return data.messages;
  },

  async sendMessage(conversationId: string, text: string): Promise<ChatMessage> {
    const { data } = await api.post<{ ok: boolean; message: ChatMessage }>(
      `/inbox/conversations/${conversationId}/messages`,
      { text }
    );
    return data.message;
  },

  async updateConversation(
    conversationId: string,
    patch: Partial<Pick<Conversation, 'tags' | 'status'>>
  ): Promise<Conversation> {
    const { data } = await api.patch<{ ok: boolean; conversation: Conversation }>(
      `/inbox/conversations/${conversationId}`,
      patch
    );
    return data.conversation;
  },

  async getQuickReplies(): Promise<QuickReply[]> {
    const { data } = await api.get<{ ok: boolean; quickReplies: QuickReply[] }>('/inbox/quick-replies');
    return data.quickReplies;
  },
};
