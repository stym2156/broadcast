export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  plan: string;
  pages: number;
  joinedAt: string;
  lastLoginAt: string;
}

export interface AdminBroadcast {
  id: string;
  ownerName: string;
  ownerEmail: string;
  title: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  sentCount: number;
  totalRecipients: number;
  createdAt: string;
}

export interface AdminSubscription {
  id: string;
  userName: string;
  userEmail: string;
  planName: string;
  amount: number;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  startedAt: string;
  expiresAt: string;
}

export interface AdminPlan {
  id: string;
  name: string;
  months: number;
  price: number;
  pricePerMonth: number;
  savingsPercent: number;
  isActive: boolean;
  subscribers: number;
}
