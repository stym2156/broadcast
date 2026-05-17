# Deployment Guide — Render (backend) + Vercel (frontend & admin)

Time to first public URL: **~20 นาที** ถ้ามี GitHub repo พร้อมแล้ว

```
┌─────────────────────┐
│  Vercel             │     ┌──────────────────┐     ┌────────────────┐
│  frontend.vercel    │ →   │  Render          │ →   │  MongoDB Atlas │
│  admin.vercel       │     │  broadcast-api   │     │  (existing)    │
└─────────────────────┘     └──────────────────┘     └────────────────┘
                                    ↓
                            ┌────────────────────┐
                            │  Meta Webhooks     │
                            │  (FB + WhatsApp)   │
                            └────────────────────┘
```

---

## Step 1 — Push to GitHub

```bash
cd f:/broadcast
git init -b main
git add .
git status                          # ตรวจให้แน่ใจว่า .env ไม่อยู่ในรายการ
git commit -m "feat: initial broadcast platform"
git remote add origin git@github.com:YOUR_USERNAME/broadcast.git
git push -u origin main
```

**Pre-flight check**: รัน `cat .gitignore | grep .env` ต้องเห็นบรรทัด `.env` — ถ้าไม่เห็น **อย่า push เด็ดขาด**

---

## Step 2 — Deploy backend ขึ้น Render (~5 นาที)

1. ไปที่ https://render.com → New → **Blueprint**
2. Connect GitHub repo `broadcast`
3. Render จะอ่าน `render.yaml` ที่ root อัตโนมัติ → ขึ้นบริการชื่อ `broadcast-api`
4. ในหน้า config ใส่ Environment Variables:

| Key | Value |
|---|---|
| `MONGODB_URI` | คัดลอกจาก `backend/.env` ของคุณ |
| `JWT_SECRET` | รัน `openssl rand -hex 32` แล้ววางค่าที่ได้ |
| `CLIENT_ORIGIN` | (ใส่ทีหลัง — รอ Vercel ขึ้นก่อน) `https://___.vercel.app` |
| `ADMIN_ORIGIN` | (ใส่ทีหลัง) `https://___.vercel.app` |
| `WA_PHONE_NUMBER_ID` | `1084134061453287` |
| `WA_BUSINESS_ACCOUNT_ID` | `1955294095110334` |
| `WA_ACCESS_TOKEN` | (คัดจาก `.env`) |
| `FB_APP_ID` | (ถ้ามี) |
| `FB_APP_SECRET` | (ถ้ามี) |

5. กด **Apply** → รอ build (~3-5 นาที)
6. ได้ URL คล้ายๆ `https://broadcast-api.onrender.com` → ทดสอบ `curl https://broadcast-api.onrender.com/health`
7. (Optional) MongoDB Atlas → Network Access → เพิ่ม `0.0.0.0/0` (allow all) เพื่อให้ Render ติดต่อได้

⚠️ **Render Free** sleep หลัง 15 นาทีไม่ใช้งาน — request แรกหลังหลับจะช้า ~30 วินาที

### Seed production database

หลัง backend ขึ้นแล้ว ไป Render Dashboard → service ของคุณ → **Shell** → รัน:
```bash
npm run seed:prod
```

---

## Step 3 — Deploy frontend ขึ้น Vercel (~5 นาที)

1. ไปที่ https://vercel.com → New Project → Import `broadcast` repo
2. **Root Directory**: `frontend`
3. Framework Preset: Vite (auto-detected)
4. Environment Variables:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://broadcast-api.onrender.com/api` |
5. **Deploy** → รอ ~2 นาที → ได้ URL เช่น `https://broadcast-xxxxx.vercel.app`

## Step 4 — Deploy admin ขึ้น Vercel (~5 นาที)

ทำซ้ำ Step 3 แต่ Root Directory = `admin`

---

## Step 5 — กลับไปอัปเดต CORS ใน Render

ตอนนี้คุณมี URL Vercel แล้ว → กลับไปที่ Render → Environment → แก้:
- `CLIENT_ORIGIN` = `https://broadcast-xxxxx.vercel.app`
- `ADMIN_ORIGIN` = `https://broadcast-admin-yyyyy.vercel.app`

Render จะ restart auto

---

## Step 6 — ตั้งค่า Meta Webhooks (ถ้าอยากให้ inbox รับข้อความจริง)

### Facebook Messenger
1. https://developers.facebook.com → your app → Messenger → Webhooks
2. **Callback URL**: `https://broadcast-api.onrender.com/webhooks/facebook`
3. **Verify Token**: `broadcast_verify_2026` (ค่าใน `.env`)
4. Subscribe fields: `messages`, `messaging_postbacks`, `message_deliveries`

### WhatsApp
1. https://developers.facebook.com → your app → WhatsApp → Configuration → Webhook
2. **Callback URL**: `https://broadcast-api.onrender.com/webhooks/whatsapp`
3. **Verify Token**: `broadcast_wa_2026`
4. Subscribe to: `messages`

---

## Step 7 — Smoke test สด

1. เปิด `https://broadcast-xxxxx.vercel.app` → login `demo@user.com / 123456`
2. ดูทุกหน้าโหลดข้อมูลจริง: Dashboard, Inbox, Pages, Broadcast, Customers, Subscription
3. ลองสมัคร user ใหม่ → ต้องสร้าง record ใน MongoDB ได้
4. เปิด admin → login `admin@broadcast.com / admin123` → ดูสถิติ

---

## Troubleshooting

| อาการ | สาเหตุ | แก้ |
|---|---|---|
| `ERR_CONNECTION_RESET` ตอนเปิด API URL แม้ Render โชว์ "Live" | มี `PORT` env var ใน dashboard ค่าว่างเปล่า → app bind port 0 (random) → Render proxy หา port ไม่เจอ | Environment → ลบ row `PORT` ทั้งแถว (ไม่ใช่แค่ลบค่า) → Save Changes → Render จะ inject PORT=10000 เอง |
| Render redeploy วน loop "New primary port detected: ..." | เหมือนข้างบน — app bind port 0 ทำให้ Node สุ่ม port ทุก restart | แก้แบบเดียวกัน — ลบ `PORT` row |
| Backend start แต่ทุก API call ค้าง/timeout | `MONGODB_URI` ไม่ได้ set บน Render → ใช้ fallback `127.0.0.1` | Environment → กรอก `MONGODB_URI` → Save Changes (โค้ดใหม่จะ crash boot ถ้า missing แทนที่จะเงียบ) |
| Boot fail `[env] Missing required env var MONGODB_URI in production` | ลืมตั้ง env var ใน Render dashboard | ตั้งให้ครบตาม Step 2 ตาราง |
| `CORS error` ใน browser console | `CLIENT_ORIGIN`/`ADMIN_ORIGIN` บน Render ไม่ตรง Vercel URL | อัปเดตให้ตรง — รองรับหลาย URL ด้วย comma เช่น `https://app.vercel.app,https://app-preview-xxx.vercel.app` |
| Backend health check fail บน Render | MongoDB Atlas ไม่ allow IP ของ Render | Atlas → Network Access → Add `0.0.0.0/0` (allow all) |
| Login บอก "Invalid credentials" | ยังไม่ seed prod DB | Render Shell → `npm run seed:prod` |
| Render service spin down | Free plan sleep หลัง 15 min | ปกติ — request แรกจะช้า ~30 วินาที |
| WhatsApp ส่งไม่ได้ | recipient number ไม่ได้ add ใน test list | Meta WhatsApp panel → Phone numbers → Add recipient |
| Frontend ขึ้น `Failed to fetch` ทุก API call | `VITE_API_URL` บน Vercel ผิด หรือยังเป็น `http://localhost:4000/api` | Vercel → project → Settings → Environment Variables → แก้ค่า → Redeploy (Vercel ต้อง build ใหม่ทั้ง process — แค่ save ไม่พอ) |

### Render Environment Variables — checklist

ทุก row ต้องมีค่า ห้ามว่าง (ค่าว่าง = ใส่ empty string ทำให้ proxy ผิดพลาด ดูแถวบน):

| Key | ใส่ค่าอะไร |
|---|---|
| `NODE_ENV` | `production` (Render auto-inject แต่ถ้าไม่เห็นให้ใส่เอง) |
| ⚠️ `PORT` | **อย่าใส่!** ห้ามมี row นี้ — Render จัดการเอง |
| `MONGODB_URI` | full Atlas URI ต้องเริ่ม `mongodb+srv://` |
| `JWT_SECRET` | random hex 64 ตัว (รัน `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_ORIGIN` | Vercel URL ของ frontend (https://...) — รองรับ comma-separated |
| `ADMIN_ORIGIN` | Vercel URL ของ admin |
| `FB_APP_ID` / `FB_APP_SECRET` | จาก Meta dashboard (ถ้าใช้ FB) |
| `FB_VERIFY_TOKEN` | string อะไรก็ได้ — ต้องตรงกับใน Meta webhook config |
| `WA_PHONE_NUMBER_ID` / `WA_BUSINESS_ACCOUNT_ID` / `WA_ACCESS_TOKEN` | จาก Meta WhatsApp API Setup |
| `WA_VERIFY_TOKEN` | string อะไรก็ได้ — ต้องตรงกับใน Meta webhook config |

---

## รายการ public URLs ที่จะมีหลัง deploy

| Service | URL ตัวอย่าง | Note |
|---|---|---|
| Backend API | `https://broadcast-api.onrender.com` | Render free |
| Frontend | `https://broadcast.vercel.app` | Vercel hobby |
| Admin | `https://broadcast-admin.vercel.app` | Vercel hobby |
| Health | `https://broadcast-api.onrender.com/health` | สำหรับ status check |
