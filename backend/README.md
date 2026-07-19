# Synkaro — Backend (NestJS)

Premium watch-together platform API. NestJS 10 + Prisma + PostgreSQL 15 + Redis 7 + Socket.IO + LiveKit.

## Quick start (local)

```bash
cp .env.example .env
# Fill DATABASE_URL, REDIS_URL, GMAIL_USER, GMAIL_APP_PASSWORD, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, JWT_REFRESH_SECRET

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

API runs on `http://localhost:3001`. Swagger at `http://localhost:3001/api/docs`.

## Modules

| Module     | Responsibility                                           |
| ---------- | -------------------------------------------------------- |
| `auth`     | Email/password, Google OAuth, JWT cookies, OTP, reset    |
| `users`    | Profile read/update                                      |
| `rooms`    | Create/join/list rooms, invite codes, host actions       |
| `chat`     | Message persistence + Socket.IO gateway                  |
| `upload`   | Chunked multipart movie/image upload                     |
| `watch`    | Watch history, continue-watching, shared watchlist       |
| `call`     | LiveKit access token generation                          |

## Socket.IO events

Wire format documented in `docs/realtime-events.md`. Authenticated via JWT in
`socket.handshake.auth.token`, `Authorization` header, or `access_token` cookie.

## Production deploy (VPS)

See `docs/deploy.md` for the full Ubuntu 22.04 + PM2 + Nginx + LetsEncrypt + LiveKit setup.
