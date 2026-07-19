# Synkaro — Web (Next.js 14)

Marketing site, app shell, real-time watch + chat + call UI.

## Quick start

```bash
cp .env.example .env.local
# Fill NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL, NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_LIVEKIT_URL

npm install
npm run dev
```

Web runs on `http://localhost:3000`. In dev, `/api/*` is rewritten to `http://localhost:3001`
so the NestJS backend is reachable without CORS friction.

## Routes

| Route                       | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `/`                         | Marketing landing page                                 |
| `/blog`, `/blog/[slug]`     | SEO blog with launch articles                          |
| `/auth/signup` ‑ `verify`   | Email + password signup, OTP verify                    |
| `/auth/login`               | Login + Google sign-in                                 |
| `/auth/forgot-password`     | Request reset link                                     |
| `/auth/reset-password`      | Reset via token                                        |
| `/dashboard`                | List rooms, create, join                               |
| `/room/[id]`                | Real-time chat + reactions                             |
| `/room/[id]/watch`          | Synced player (uploads + YouTube)                      |
| `/room/[id]/call`           | LiveKit HD audio/video                                 |
| `/join/[code]`              | Deep-link auto-join                                    |

## Build for VPS

```bash
npm run build
pm2 start npm --name synkaro-web -- start
```
