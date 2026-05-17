# BroadCast — Facebook Messenger + WhatsApp Broadcast Platform

ระบบ broadcast ผ่าน Facebook Messenger **และ** WhatsApp Cloud API หาลูกค้าเก่าได้ไม่จำกัด รองรับ multi-page/multi-number, tag-based targeting, scheduled sending, inbox สำหรับตอบ และ subscription billing

```
broadcast/
├── frontend/    React + Vite + TS  →  http://localhost:5173   (ลูกค้าทั่วไป)
├── admin/       React + Vite + TS  →  http://localhost:5174   (แอดมินดูแลระบบ)
└── backend/     Node + Express + TS + MongoDB  →  http://localhost:4000  (REST API + webhooks)
```

## วิธีรัน (จาก 0)

```bash
# 1. Backend
cd backend
cp .env.example .env       # แก้ MONGODB_URI ตามจริง
npm install
npm run seed               # สร้าง demo data + accounts ใน MongoDB Atlas
npm run dev                # http://localhost:4000

# 2. Frontend (เปิดอีก terminal)
cd frontend && npm install && npm run dev    # http://localhost:5173

# 3. Admin (เปิดอีก terminal)
cd admin && npm install && npm run dev       # http://localhost:5174
```

## บัญชี Demo (เริ่มหลังรัน `npm run seed`)

```
Frontend:  email: demo@user.com         password: 123456
Admin:     email: admin@broadcast.com   password: admin123
```

## Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend / Admin | React 18, TypeScript, Vite, TailwindCSS, React Router v6, Zustand, Axios, Lucide, Recharts |
| Backend | Node.js 18+, Express, TypeScript, Mongoose (MongoDB), JWT, bcrypt, Zod |
| Integrations | Facebook Graph API v19 (Messenger), WhatsApp Cloud API |

## โหมดการทำงานของช่องทาง

ระบบทำงานได้ทั้งเมื่อมีและไม่มี Meta credentials:

| มี FB/WA token | ไม่มี FB/WA token |
|---|---|
| Inbox สามารถส่งข้อความออกจริงผ่าน Messenger/WhatsApp | Inbox บันทึกข้อความใน DB เฉยๆ (พิมพ์ warn ใน log) |
| Webhook รับ message เข้าจริง | Webhook ตรงๆ ไม่ทำงาน — ใช้ seed data demo |
| OAuth Login ผ่าน Facebook ได้ | ปุ่ม "ดำเนินการต่อด้วย Facebook" จะ error |

วิธีนี้ทำให้ demo ระบบได้ทันทีโดยไม่ต้องรอ Meta Business Verification

## Facebook Messenger ตั้งค่า

1. https://developers.facebook.com → My Apps → Create App (type: Business)
2. App settings → Basic: คัดลอก **App ID** + **App Secret** ลง `.env`
3. Add Product → Facebook Login → ตั้ง redirect URI = `http://localhost:5173/auth/facebook/callback`
4. Add Product → Messenger → Webhooks → Callback URL = `https://your-tunnel.example/webhooks/facebook` (ใช้ ngrok สำหรับ dev), Verify Token = ค่าเดียวกับใน `.env`
5. Subscribe ไปยัง: `messages`, `messaging_postbacks`, `message_deliveries`

## WhatsApp Cloud ตั้งค่า

1. ใน FB App เดิม → Add Product → WhatsApp
2. API Setup → คัดลอก **Phone number ID**, **Business Account ID**, **Temporary access token** (24h) ลง `.env`
3. Webhooks → Callback URL = `https://your-tunnel.example/webhooks/whatsapp`, Verify Token = ค่าเดียวกับใน `.env`
4. Test number ที่ Meta ให้มา ใช้ได้ฟรี ไม่ต้องผ่าน Business Verification

## API Endpoints (สรุป)

| Method | Path | คำอธิบาย |
|---|---|---|
| `GET` | `/health` | health check |
| `POST` | `/api/auth/register` | สมัครสมาชิก |
| `POST` | `/api/auth/login` | เข้าสู่ระบบ (รองรับทั้ง user + admin role) |
| `GET` | `/api/oauth/facebook/start` | สร้าง FB OAuth URL |
| `POST` | `/api/oauth/facebook/callback` | แลก code → JWT |
| `POST` | `/api/oauth/facebook/pages/connect` | เชื่อมเพจที่จัดการอยู่ |
| `GET\|POST\|DELETE` | `/api/pages` | จัดการช่องทาง FB/WA |
| `GET` | `/api/customers` | รายชื่อลูกค้า |
| `GET\|POST` | `/api/broadcasts` | broadcast |
| `GET\|POST` | `/api/inbox/conversations` | บทสนทนา |
| `GET\|POST` | `/api/inbox/conversations/:id/messages` | ข้อความ + ส่งตอบ (ผ่าน FB/WA จริงถ้ามี token) |
| `PATCH` | `/api/inbox/conversations/:id` | เปลี่ยน status / tags |
| `GET\|POST\|DELETE` | `/api/inbox/quick-replies` | quick replies |
| `GET` | `/api/subscriptions/plans` | แพ็กเกจ (public) |
| `GET\|POST` | `/api/subscriptions/me`, `/subscribe` | subscription |
| `GET` | `/api/stats/user-dashboard` | dashboard ลูกค้า |
| `GET\|PATCH` | `/api/admin/*` | admin endpoints (ต้อง role=admin) |
| `GET\|POST` | `/webhooks/facebook` | FB webhook (signature verified) |
| `GET\|POST` | `/webhooks/whatsapp` | WA webhook (signature verified) |

## ตัวแปร ENV ที่ต้องใส่

ดู `backend/.env.example` ทุกตัวพร้อมคำอธิบาย
