'use client';

import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  const url = process.env.NEXT_PUBLIC_WS_URL || '';
  socket = io(url, {
    withCredentials: true,
    transports: ['websocket'],
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export interface SendMessagePayload {
  roomId: string;
  content?: string;
  type?: 'text' | 'image' | 'sticker' | 'gif';
  fileUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send a chat message with a server acknowledgement so failures are never
 * silent. If the socket is disconnected, socket.io buffers and flushes on
 * reconnect; if the server fails to persist, `onFail` is called.
 */
export function sendChatMessage(
  payload: SendMessagePayload,
  onFail?: (error: string) => void,
): void {
  const s = getSocket();
  s.timeout(10_000).emit(
    'message:send',
    payload,
    (err: Error | null, ack?: { ok: boolean; error?: string }) => {
      if (err) {
        onFail?.('Message may not have been delivered. Check your connection.');
        return;
      }
      if (ack && !ack.ok) onFail?.(ack.error || 'Message failed to send');
    },
  );
}

export interface MessageDto {
  id: string;
  roomId: string;
  senderId: string;
  username: string;
  avatar: string | null;
  content: string | null;
  type: string;
  fileUrl: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface FloatingReactionDto {
  userId: string;
  username: string;
  emoji: string;
  timestamp: number;
}

export interface CallStartedDto {
  roomId: string;
  startedByName: string;
  startedAt: number;
}

export interface CallParticipantDto {
  userId: string;
  username: string;
  participantCount?: number;
  remaining?: number;
}

export interface WatchStateDto {
  isPlaying: boolean;
  timestamp: number;
  updatedBy: string;
  updatedAt: number;
}
