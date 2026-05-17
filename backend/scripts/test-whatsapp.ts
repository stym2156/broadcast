/**
 * End-to-end WhatsApp test for the demo user.
 *
 * Usage:  npm run test:wa -- 66812345678
 *   phone in E.164 format WITHOUT the leading `+` (e.g. 66812345678 for +66 81-234-5678)
 *
 * What it does:
 *   1. Sends the pre-approved `hello_world` template message to your phone
 *      (opens Meta's 24-hour customer-service window).
 *   2. Upserts a real WhatsApp Page in MongoDB pointing at WA_PHONE_NUMBER_ID + WA_ACCESS_TOKEN.
 *   3. Upserts a Customer record for your phone.
 *   4. Upserts a Conversation with waWindowExpiresAt = now + 24h so the Inbox UI can send
 *      free-form text from now on (within the window).
 *
 * After running, open http://localhost:5173/inbox → filter WhatsApp → click your conversation
 * → type a message → press send. It should arrive on your phone within a few seconds.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { sendTemplate, waConfig, isWaConfigured } from '../src/services/whatsapp';
import { User } from '../src/models/User';
import { Page } from '../src/models/Page';
import { Customer } from '../src/models/Customer';
import { Conversation } from '../src/models/Conversation';
import { Message } from '../src/models/Message';

async function main() {
  const phone = process.argv[2];
  if (!phone || !/^\d{8,15}$/.test(phone)) {
    console.error('Usage: npm run test:wa -- <phone>');
    console.error('  phone must be digits only in E.164 (no +), e.g. 66812345678');
    process.exit(1);
  }
  if (!isWaConfigured()) {
    console.error('WhatsApp not configured — set WA_PHONE_NUMBER_ID and WA_ACCESS_TOKEN in .env');
    process.exit(1);
  }

  const cfg = waConfig();
  console.log(`[wa-test] WA Phone Number ID: ${cfg.phoneNumberId}`);
  console.log(`[wa-test] sending hello_world template to +${phone} ...`);

  let templateMessageId: string | null = null;
  try {
    const res = await sendTemplate({
      to: phone,
      templateName: 'hello_world',
      languageCode: 'en_US',
    });
    templateMessageId = res.messages[0]?.id ?? null;
    console.log(`[wa-test] ✓ template sent — message_id: ${templateMessageId}`);
  } catch (err) {
    console.error('[wa-test] ✗ Meta API rejected the send:', (err as Error).message);
    console.error('[wa-test] common causes:');
    console.error('  - the phone is not in Meta → WhatsApp → API Setup → "To" allow-list');
    console.error('  - WA_ACCESS_TOKEN has expired (the 24h temporary token only lasts 24h)');
    process.exit(1);
  }

  console.log('[wa-test] connecting to MongoDB ...');
  await mongoose.connect(env.MONGODB_URI);

  const demoUser = await User.findOne({ email: 'demo@user.com' });
  if (!demoUser) {
    console.error('[wa-test] demo user not found — run `npm run seed` first');
    process.exit(1);
  }

  const page = await Page.findOneAndUpdate(
    { owner: demoUser._id, channel: 'whatsapp', fbPageId: cfg.phoneNumberId },
    {
      $setOnInsert: { owner: demoUser._id, channel: 'whatsapp', fbPageId: cfg.phoneNumberId },
      $set: {
        name: 'WhatsApp Test (Live)',
        phoneNumber: '+1 555-645-1551',
        waBusinessAccountId: cfg.businessAccountId,
        status: 'connected',
        subscribersCount: 1,
      },
    },
    { upsert: true, new: true }
  );
  console.log(`[wa-test] ✓ Page record: ${page._id}`);

  const customer = await Customer.findOneAndUpdate(
    { page: page._id, psid: phone },
    {
      $setOnInsert: { owner: demoUser._id, page: page._id, psid: phone },
      $set: { name: `เบอร์ +${phone}`, lastInteractionAt: new Date() },
    },
    { upsert: true, new: true }
  );
  console.log(`[wa-test] ✓ Customer record: ${customer._id}`);

  const cv = await Conversation.findOneAndUpdate(
    { page: page._id, customer: customer._id },
    {
      $setOnInsert: {
        owner: demoUser._id,
        channel: 'whatsapp',
        page: page._id,
        customer: customer._id,
      },
      $set: {
        lastMessage: '[hello_world] Hello World',
        lastMessageAt: new Date(),
        // We just sent a template, so the 24h customer-service window is open.
        waWindowExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        status: 'open',
        unreadCount: 0,
      },
    },
    { upsert: true, new: true }
  );
  console.log(`[wa-test] ✓ Conversation record: ${cv._id}`);

  await Message.create({
    conversation: cv._id,
    direction: 'outbound',
    kind: 'text',
    text: '[hello_world template] Hello World',
    sentAt: new Date(),
    fbMessageId: templateMessageId,
  });

  console.log('\n[wa-test] DONE ✅\n');
  console.log('Next steps:');
  console.log(`  1. ตรวจ WhatsApp ของเบอร์ +${phone} — ควรได้รับข้อความ "Hello World" จาก +1 555 645 1551`);
  console.log('  2. เปิด http://localhost:5173/inbox → filter "WhatsApp" → จะเห็น conversation ใหม่');
  console.log('  3. พิมพ์ข้อความใน Inbox UI → กด send → ต้องไปถึง WhatsApp ของคุณจริง');
  console.log('  4. (Optional) ตอบกลับจาก WhatsApp ของคุณ — เปิด window ฝั่ง Meta อย่างเป็นทางการ');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[wa-test] crashed:', err);
  process.exit(1);
});
