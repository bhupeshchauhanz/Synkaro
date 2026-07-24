'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';
import { getSocket, sendChatMessage, type MessageDto } from '@/lib/socket';
import { playSfx } from '@/lib/sfx';
import { MessageList } from '../room/message-list';
import { ChatInput } from '../room/chat-input';
import { ChevronDown } from 'lucide-react';

export function WatchChat({ roomId, currentUserId }: { roomId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [members, setMembers] = useState<{ id: string; username: string }[]>([]);
  const [typing, setTyping] = useState<{ userId: string; username: string }[]>([]);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<MessageDto[]>(`/rooms/${roomId}/messages`)
      .then((res) => {
        if (!cancelled) setMessages(res.data);
      })
      .catch((err) => toast.error(getApiError(err).error));
    // Room members so the reaction sheet can show real names in the in-call chat
    api.get<{ members: { id: string; username: string }[] }>(`/rooms/${roomId}`)
      .then((res) => { if (!cancelled) setMembers(res.data.members ?? []); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [roomId]);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      api
        .get<MessageDto[]>(`/rooms/${roomId}/messages`)
        .then((res) => setMessages(res.data))
        .catch(() => undefined);
    };
    socket.on('connect', onConnect);

    const onMessage = (m: MessageDto) => {
      // Play notification sound for messages from other users
      if (m.senderId !== currentUserId) {
        playSfx('notification');
      }
      setMessages((prev) => (prev.find((p) => p.id === m.id) ? prev : [...prev, m]));
    };
    const onDeleted = ({ messageId }: { messageId: string }) =>
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    const onReadUpdate = ({ messageId, readBy }: { messageId: string; readBy: string[] }) =>
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, metadata: { ...(m.metadata as Record<string, unknown> || {}), readBy } }
            : m
        )
      );
    const onReactionUpdate = ({ messageId, reactions }: { messageId: string; reactions: Record<string, string[]> }) =>
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, metadata: { ...(m.metadata as Record<string, unknown> || {}), reactions } }
            : m
        )
      );
    const onTyping = ({ userId, username, isTyping }: { userId: string; username: string; isTyping: boolean }) => {
      setTyping((prev) => {
        if (isTyping) {
          if (prev.find((p) => p.userId === userId)) return prev;
          return [...prev, { userId, username }];
        }
        return prev.filter((p) => p.userId !== userId);
      });
    };

    socket.on('message:new', onMessage);
    socket.on('message:deleted', onDeleted);
    socket.on('message:read:update', onReadUpdate);
    socket.on('message:reaction:update', onReactionUpdate);
    socket.on('typing:update', onTyping);

    return () => {
      socket.off('connect', onConnect);
      socket.off('message:new', onMessage);
      socket.off('message:deleted', onDeleted);
      socket.off('message:read:update', onReadUpdate);
      socket.off('message:reaction:update', onReactionUpdate);
      socket.off('typing:update', onTyping);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const sendMessage = useCallback((content: string) => {
    sendChatMessage({ roomId, content, type: 'text' }, (e) => toast.error(e));
  }, [roomId]);

  const onTypingStart = useCallback(() => {
    getSocket().emit('typing:start', { roomId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      getSocket().emit('typing:stop', { roomId });
    }, 2500);
  }, [roomId]);

  const onTypingStop = useCallback(() => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    getSocket().emit('typing:stop', { roomId });
  }, [roomId]);

  // Track scroll position to determine if user is near the bottom
  const isAtBottomRef = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    scrollContainerRef.current = el;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isAtBottomRef.current = nearBottom;
    if (nearBottom) setHasNewMessages(false);
  }, []);

  // Auto-scroll to bottom when new messages arrive and user is at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      setHasNewMessages(false);
    } else {
      setHasNewMessages(true);
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setHasNewMessages(false);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg-base relative">
      <div className="shrink-0 border-b border-white/[0.06] px-3 py-2 bg-black/40">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Live Chat</h3>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <MessageList messages={messages} currentUserId={currentUserId} typing={typing} roomId={roomId} members={members} disableLightbox onScroll={handleScroll} />
        {/* Scroll-to-bottom indicator */}
        {hasNewMessages && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-2 right-2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg hover:bg-indigo-400 transition-colors animate-bounce"
            aria-label="Scroll to new messages"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="shrink-0">
        <ChatInput
          onSend={sendMessage}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
          roomId={roomId}
        />
      </div>
    </div>
  );
}
