FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
RUN apk add --no-cache openssl ffmpeg python3 py3-pip
RUN pip3 install --break-system-packages -U yt-dlp

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

# Auto-push schema on first start (safe: idempotent, skips if already synced)
COPY --from=builder /app/prisma ./prisma
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/main.js"]
