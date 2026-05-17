export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: 'user' | 'admin';
}

export type Channel = 'facebook' | 'whatsapp';

export interface FbPage {
  id: string;
  channel: Channel;
  fbPageId: string;
  name: string;
  avatar?: string | null;
  subscribersCount: number;
  status: 'connected' | 'expired' | 'disabled';
  phoneNumber?: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  pageId: string;
  pageName: string;
  psid: string;
  name: string;
  avatar?: string | null;
  tags: string[];
  lastInteractionAt: string;
}

export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  imageUrl?: string | null;
  pages: string[];
  pageNames: string[];
  targetTags: string[];
  scheduledAt?: string | null;
  status: BroadcastStatus;
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
  createdAt: string;
  completedAt?: string | null;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  months: number;
  price: number;
  pricePerMonth: number;
  savingsPercent: number;
  features: string[];
}

export interface Subscription {
  id: string;
  plan: Plan;
  startedAt: string;
  expiresAt: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  amountPaid: number;
  autoRenew: boolean;
}

export type MessageDirection = 'inbound' | 'outbound';
export type MessageKind = 'text' | 'image' | 'sticker';

export interface ChatMessage {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  kind: MessageKind;
  text: string;
  imageUrl?: string | null;
  sentAt: string;
  senderName?: string;
}

export interface Conversation {
  id: string;
  channel: Channel;
  pageId: string;
  pageName: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string | null;
  customerPhone?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  tags: string[];
  status: 'open' | 'pending' | 'closed';
  assignedTo?: string | null;
  /** WhatsApp 24h customer-service window. Outside this window only template messages are allowed. */
  waWindowExpiresAt?: string | null;
}

export interface QuickReply {
  id: string;
  title: string;
  text: string;
}
