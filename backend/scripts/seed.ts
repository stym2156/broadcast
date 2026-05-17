/**
 * Seed the database with initial data so the UI has something to show.
 *
 * Run with: `npm run seed`
 *
 * Idempotent: re-running won't duplicate data, but it WILL reset demo passwords
 * and demo conversations so the demo account always works the same way.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { User } from '../src/models/User';
import { Plan } from '../src/models/Plan';
import { Page } from '../src/models/Page';
import { Customer } from '../src/models/Customer';
import { Conversation } from '../src/models/Conversation';
import { Message } from '../src/models/Message';
import { Broadcast } from '../src/models/Broadcast';
import { Subscription } from '../src/models/Subscription';
import { QuickReply } from '../src/models/QuickReply';

const PLANS_DATA = [
  { code: 'M1', name: '1 เดือน', months: 1, price: 590, pricePerMonth: 590, savingsPercent: 0,
    features: ['ส่งข้อความไม่จำกัด', 'เพจไม่จำกัด', 'ตั้งเวลาส่ง', 'รองรับ Tag'] },
  { code: 'M3', name: '3 เดือน', months: 3, price: 1590, pricePerMonth: 530, savingsPercent: 10,
    features: ['ทุกอย่างใน 1 เดือน', 'ประหยัด 10%', 'Priority support'] },
  { code: 'M6', name: '6 เดือน', months: 6, price: 2990, pricePerMonth: 498, savingsPercent: 16,
    features: ['ทุกอย่างใน 3 เดือน', 'ประหยัด 16%', 'Analytics report รายเดือน'] },
  { code: 'M12', name: '12 เดือน', months: 12, price: 5590, pricePerMonth: 466, savingsPercent: 21,
    features: ['ทุกอย่างใน 6 เดือน', 'ประหยัดสูงสุด 21%', 'Dedicated account manager'] },
];

const QUICK_REPLIES_DATA = [
  { title: 'ทักทาย', text: 'สวัสดีค่ะ ยินดีให้บริการ มีอะไรให้ช่วยมั้ยคะ' },
  { title: 'แจ้งราคา', text: 'ราคา 590 บาทค่ะ ค่าส่ง 50 บาท รวม 640 บาท' },
  { title: 'เลขบัญชี', text: 'โอนได้ที่ ธ.กสิกรไทย 123-4-56789-0 ชื่อบัญชี ร้านของเรา' },
  { title: 'ขอบคุณ', text: 'ขอบคุณที่อุดหนุนค่ะ จะรีบจัดส่งให้นะคะ' },
];

const SAMPLE_NAMES = ['คุณนิด', 'คุณบอย', 'คุณพลอย', 'คุณภูมิ', 'คุณจอย', 'คุณก้อง', 'คุณแนน', 'คุณเอก'];
const SAMPLE_MESSAGES = [
  'สวัสดีค่ะ สอบถามสินค้าหน่อย',
  'มีไซส์ M สีดำมั้ยคะ',
  'ราคาเท่าไหร่คะ',
  'ส่งของไปจังหวัดเชียงใหม่ค่าส่งเท่าไหร่',
  'สั่งของได้เลยมั้ยคะ',
  'โอนเงินแล้วค่ะ',
  'ของถึงยังคะ',
  'ขอบคุณค่ะ สวยมาก',
  'มีโปรเดือนนี้มั้ย',
];

async function upsertPlans() {
  for (const p of PLANS_DATA) {
    await Plan.updateOne({ code: p.code }, { $set: p }, { upsert: true });
  }
  console.log('[seed] plans ✓');
}

async function upsertUser(email: string, name: string, plainPassword: string, role: 'user' | 'admin') {
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { name, passwordHash, role, status: 'active' } },
    { upsert: true, new: true }
  );
  return user;
}

async function seedDemoUserData(userId: mongoose.Types.ObjectId) {
  // Clear previous demo data for a clean re-seed — STRICTLY scoped to the demo user
  // so running this against a populated production DB cannot wipe real users' data.
  //
  // Order matters: collect conversation IDs BEFORE deleting conversations, so we can
  // target the right Message documents (Message has no `owner` of its own — it inherits
  // ownership through `conversation -> owner`).
  const demoConvIds = await Conversation.find({ owner: userId }).distinct('_id');
  await Message.deleteMany({ conversation: { $in: demoConvIds } });
  await Page.deleteMany({ owner: userId });
  await Customer.deleteMany({ owner: userId });
  await Conversation.deleteMany({ owner: userId });
  await Broadcast.deleteMany({ owner: userId });
  await Subscription.deleteMany({ user: userId });
  await QuickReply.deleteMany({ owner: userId });

  const pages = await Page.insertMany([
    { owner: userId, channel: 'facebook', fbPageId: '102938475', name: 'ร้านเสื้อผ้าแฟชั่น Lulu', subscribersCount: 18430, status: 'connected' },
    { owner: userId, channel: 'facebook', fbPageId: '298374651', name: 'Beauty Box Thailand', subscribersCount: 9821, status: 'connected' },
    { owner: userId, channel: 'facebook', fbPageId: '561728394', name: 'อาหารเสริมคุณแม่', subscribersCount: 5240, status: 'expired' },
    { owner: userId, channel: 'whatsapp', fbPageId: '15551234001', name: 'Lulu Fashion WA', phoneNumber: '+66 2 555 0001', subscribersCount: 3412, status: 'connected' },
    { owner: userId, channel: 'whatsapp', fbPageId: '15551234002', name: 'Beauty Box WA', phoneNumber: '+66 2 555 0002', subscribersCount: 1908, status: 'connected' },
  ]);

  // Customers per page (mostly inactive contacts who could be broadcast targets).
  const customerDocs: Array<{
    owner: mongoose.Types.ObjectId; page: mongoose.Types.ObjectId; psid: string; name: string; tags: string[]; lastInteractionAt: Date;
  }> = [];
  for (let i = 0; i < 42; i++) {
    const page = pages[i % 2]; // mostly on first two pages
    customerDocs.push({
      owner: userId,
      page: page._id,
      psid: `psid_${1000 + i}`,
      name: `${SAMPLE_NAMES[i % SAMPLE_NAMES.length]} ${i + 1}`,
      tags: i % 3 === 0 ? ['ลูกค้าเก่า', 'VIP'] : i % 2 === 0 ? ['ลูกค้าใหม่'] : ['สนใจสินค้า A'],
      lastInteractionAt: new Date(Date.now() - i * 86_400_000),
    });
  }
  const customers = await Customer.insertMany(customerDocs);

  // Conversations across both channels — pick ~24 customers and create conversations.
  const conversations = [];
  for (let i = 0; i < 24; i++) {
    const page = pages[i % pages.length];
    const customer = customers[i];
    const lastMessageAt = new Date(Date.now() - i * 600_000 - Math.random() * 3600_000);
    const waWindowExpiresAt =
      page.channel === 'whatsapp'
        ? new Date(lastMessageAt.getTime() + (i % 2 === 0 ? 22 : -2) * 3600_000)
        : null;
    const cv = await Conversation.create({
      owner: userId,
      channel: page.channel,
      page: page._id,
      customer: customer._id,
      lastMessage: SAMPLE_MESSAGES[i % SAMPLE_MESSAGES.length],
      lastMessageAt,
      unreadCount: i % 4 === 0 ? Math.floor(Math.random() * 5) + 1 : 0,
      tags: i % 5 === 0 ? ['ลูกค้าใหม่'] : i % 3 === 0 ? ['สอบถาม', 'รอตอบ'] : i % 2 === 0 ? ['ปิดการขาย'] : [],
      status: i % 7 === 0 ? 'closed' : i % 3 === 0 ? 'pending' : 'open',
      waWindowExpiresAt,
    });
    conversations.push(cv);
    // Build a small message thread.
    const count = 4 + (i % 5);
    const base = lastMessageAt.getTime();
    const thread = [];
    for (let j = 0; j < count; j++) {
      const inbound = j % 2 === 0;
      thread.push({
        conversation: cv._id,
        direction: inbound ? 'inbound' : 'outbound',
        kind: 'text' as const,
        text: inbound
          ? SAMPLE_MESSAGES[(i + j) % SAMPLE_MESSAGES.length]
          : ['สวัสดีค่ะ ยินดีให้บริการ', 'มีค่ะ มีให้เลือก 5 สี', 'ราคา 590 บาทค่ะ', 'ค่าส่ง 50 บาทค่ะ', 'รับทราบค่ะ จัดส่งให้พรุ่งนี้'][j % 5],
        sentAt: new Date(base - (count - j) * 5 * 60_000),
        senderName: inbound ? customer.name : 'คุณดีโม่',
      });
    }
    await Message.insertMany(thread);
  }

  // Broadcasts
  await Broadcast.create({
    owner: userId,
    pages: [pages[0]._id, pages[1]._id],
    title: 'โปรโมชั่นต้อนรับเดือนใหม่',
    message: 'สวัสดีค่ะ ลดสูงสุด 30% ทุกรายการ เฉพาะวันนี้เท่านั้น 🎉',
    targetTags: ['ลูกค้าเก่า', 'VIP'],
    status: 'completed',
    sentCount: 12_840,
    failedCount: 35,
    totalRecipients: 12_875,
    completedAt: new Date(),
  });
  await Broadcast.create({
    owner: userId,
    pages: [pages[0]._id],
    title: 'แจ้งสินค้ามาใหม่ — Summer Collection',
    message: 'มาแล้ว! คอลเลคชั่นใหม่สำหรับหน้าร้อน เริ่มต้น 299.- ดูสินค้าเลย',
    targetTags: ['ลูกค้าใหม่'],
    scheduledAt: new Date(Date.now() + 86_400_000),
    status: 'scheduled',
    totalRecipients: 4_212,
  });

  // Subscription — 6-month active plan
  const sixMonthPlan = await Plan.findOne({ code: 'M6' });
  if (sixMonthPlan) {
    await Subscription.create({
      user: userId,
      plan: sixMonthPlan._id,
      startedAt: new Date(Date.now() - 60 * 86_400_000),
      expiresAt: new Date(Date.now() + 120 * 86_400_000),
      status: 'active',
      amountPaid: sixMonthPlan.price,
      autoRenew: true,
    });
  }

  // Quick replies
  await QuickReply.insertMany(
    QUICK_REPLIES_DATA.map((q, i) => ({ ...q, owner: userId, sortOrder: i }))
  );
}

async function main() {
  console.log('[seed] connecting to', env.MONGODB_URI.replace(/\/\/[^@]+@/, '//****:****@'));
  await mongoose.connect(env.MONGODB_URI);

  await upsertPlans();
  const demoUser = await upsertUser('demo@user.com', 'คุณดีโม่', '123456', 'user');
  const adminUser = await upsertUser('admin@broadcast.com', 'Admin BroadCast', 'admin123', 'admin');
  console.log('[seed] users ✓ (demo + admin)');

  await seedDemoUserData(demoUser._id);
  console.log('[seed] demo data ✓ (pages, customers, conversations, broadcasts, subscription, quick replies)');

  // Touch adminUser so TS doesn't complain about unused variable.
  void adminUser;

  console.log('\n[seed] DONE — login credentials:');
  console.log('  user:  demo@user.com  / 123456');
  console.log('  admin: admin@broadcast.com / admin123\n');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
