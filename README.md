<p align="center">
  <img src="./logo.png" alt="Synkaro" width="120" />
</p>

<h1 align="center">Synkaro</h1>

![License: Proprietary](https://img.shields.io/badge/license-Proprietary-red)
![Status: Production](https://img.shields.io/badge/status-live-brightgreen)
![Built with](https://img.shields.io/badge/built%20with-Next.js%20%C2%B7%20NestJS%20%C2%B7%20LiveKit-6366f1)
![Author](https://img.shields.io/badge/built%20by-Bhupesh%20Chauhan-black)

> ⚠️ **Proprietary — not open source.** © 2026 Bhupesh Chauhan. All rights reserved. See [LICENSE](./LICENSE). Visible for reference only; no reuse without written permission.

A high-performance, real-time synchronized media sharing and communication platform for couples and friends.

📐 **System design & architecture:** [synkaro.bhupeshchauhan.in/system-design](https://synkaro.bhupeshchauhan.in/system-design)

## Features

- **Real-time voice & video calls** (LiveKit / WebRTC) — adaptive streaming + dynacast, poor-network auto camera-off with a notification to everyone, portrait-aware tiles with three display modes (Smart Fill / Fit / Smart Zoom) via a per-tile menu, pin-to-focus, camera-off avatar, and call sound effects (incoming/outgoing ring, join/leave, airhorn).
- **Watch together** — upload a video and play it in sync for everyone: latency-compensated playback with smooth `playbackRate` drift correction, a **buffering pause-to-wait** so a slow viewer is never force-skipped, **resume-where-you-left-off** (exact position saved as you watch and flushed on exit), playback attribution ("X paused"), floating emoji reactions, and three content display modes (Fit / Fill / Zoom). A custom player with a buffered/hover-preview **seek bar** and a **volume slider**.
- **In-call Watch mode** — from a call, one tap opens watch-together for **all** participants: the synced player + library fill the main area while call tiles, controls and chat sit in the sidebar (couple = vertical stack, friends = horizontal strip). Opening a video selects it for everyone, and a **single-uploader lock** prevents upload clashes.
- **Couple & friend rooms** — couple rooms (max **2**) put your partner front-and-center (70/30 with self + chat); friend rooms (max **4**) use a responsive grid.
- **Chat** — encrypted at rest, typing indicators, read receipts, **WhatsApp-style persisted reactions** (with a who-reacted sheet, tap to add/remove your own), image lightbox, reliable delivery via server acks, and re-sync on reconnect.
- **App-wide notifications** — new-message sound + browser notification + toast on any page, per-room unread indicators, and a **global incoming-call popup** (accept / decline). Couple / two-person calls hang up instantly on decline or drop.
- **Profile gate** — a completed profile (bio, phone, date of birth) is required before creating or joining a room (avatar optional).
- **Admin** — trend charts (signups / messages / rooms), room-type split, storage usage, a user-detail view, **CSV export**, and user/room management.
- **Chunked uploads** — up to 3GB per video, 4GB per room, with fast client-side pre-checks (format / size / room space) and automatic chunk retries.

## Technology Stack

- **Frontend:** Next.js 14 (App Router, React 18), TailwindCSS, Zustand, Radix UI, Framer Motion
- **Backend:** NestJS 10, Prisma ORM, Socket.IO
- **Database / Cache:** PostgreSQL 15, Redis 7
- **RTC Engine:** LiveKit
- **Deployment:** Docker, Nginx

## Real-time & call behavior (notes)

- **Presence** — the client sends a heartbeat every 45s (and on focus). This powers "online" state and reliable incoming-call delivery.
- **Calls** — a user can always start a call and wait; the caller sees a "Waiting for <partner>" screen with an outgoing ring while other members get an incoming ring + popup (if their app is open) or can join later. Simultaneous mutual calls dedupe into a single room. Only one live call runs at a time — accepting a new call switches you over. In couple / two-person rooms the call ends the moment either side leaves, drops or declines.
- **Poor network** — if the local connection stays poor for ~6s with the camera on, the camera is turned off (audio stays smooth) and everyone is told; when the network recovers, the user is prompted to turn it back on.
- **Watch sync** — playback is latency-compensated and drift is corrected by nudging playback speed; if a viewer buffers, everyone waits for them. A manual "Resync" is also available. Your position is saved continuously (and flushed exactly on exit) so you resume where you left off.

### In-call Watch mode

Inside a call, tap the **TV** button to switch to watch-together: the synced player + library take the main 70% while your call tiles, controls and chat move to the 30% sidebar. The LiveKit call stays fully connected — tap TV again to go back to the full call view.

### Known limitations

- **Per-user adaptive quality for uploaded MP4** is not implemented — true adaptive bitrate needs a server-side HLS/DASH transcoding pipeline (ffmpeg producing multiple renditions). Uploaded videos are served as-is; the player shows a "Slow network" hint and handles buffering, and call video already adapts via LiveKit.
- **MKV** is not accepted — browsers cannot play Matroska in `<video>`. Use MP4 or WebM.

## Local development

Backend:
```bash
cd backend
npm install
docker compose up -d          # postgres, redis, livekit
npm run prisma:migrate
npm run start:dev
```

Web:
```bash
cd web
npm install
npm run dev
```

## Deployment

Synkaro is designed to be deployed using Docker. Ensure Docker and Docker Compose are installed on your host system.

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## License

Proprietary — © 2026 Bhupesh Chauhan. All rights reserved. See [LICENSE](./LICENSE). This is **not** open-source software.
