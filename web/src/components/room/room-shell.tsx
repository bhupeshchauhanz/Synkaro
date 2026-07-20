'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { getSocket, sendChatMessage, type MessageDto, type FloatingReactionDto } from '@/lib/socket';
import { RoomHeader } from './room-header';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { FloatingReactions } from './floating-reactions';
import { RoomSettings, ALL_BACKGROUNDS } from './room-settings';

interface RoomMember {
  id: string;
  username: string;
  avatar: string | null;
  nickname: string | null;
  role: string;
}

interface RoomDetail {
  id: string;
  name: string;
  nickname: string | null;
  type: 'couple' | 'friend';
  inviteCode: string;
  currentTheme: string;
  background: string | null;
  ownerId: string;
  members: RoomMember[];
}

interface FloatingReaction extends FloatingReactionDto {
  id: string;
  x: number;
}

function backgroundStyle(bg: string | null): React.CSSProperties {
  if (!bg) return {};
  if (bg.startsWith('preset:')) {
    const found = ALL_BACKGROUNDS.find((p) => p.id === bg);
    if (found) {
      return {
        backgroundImage: found.gradient,
        backgroundSize: 'cover',
      };
    }
  }
  if (bg.startsWith('/uploads/')) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '');
    return {
      backgroundImage: `url(${apiBase}${bg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return {};
}

export function RoomShell({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { user, status, load } = useAuthStore();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [typing, setTyping] = useState<{ userId: string; username: string }[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const messagesLoaded = useRef(false);

  // Request notification permissions
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  useEffect(() => {
    if (status === 'guest') router.replace(`/auth/login?next=/room/${roomId}`);
  }, [status, router, roomId]);

  const fetchRoom = async () => {
    const [roomRes, msgRes] = await Promise.all([
      api.get<RoomDetail>(`/rooms/${roomId}`),
      api.get<MessageDto[]>(`/rooms/${roomId}/messages`),
    ]);
    setRoom(roomRes.data);
    setMessages(msgRes.data);
    messagesLoaded.current = true;
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    fetchRoom().catch((err) => {
      if (cancelled) return;
      toast.error(getApiError(err).error);
      router.replace('/dashboard');
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, status, router]);

  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    const socket = getSocket();

    const onConnect = () => {
      socket.emit('room:join', { roomId });
      // Only resync messages if we were previously connected and reconnected
      // (i.e., socket dropped and came back). On initial mount, fetchRoom() already loaded messages.
      if (messagesLoaded.current) {
        api
          .get<MessageDto[]>(`/rooms/${roomId}/messages`)
          .then((res) => setMessages(res.data))
          .catch(() => undefined);
      }
    };
    if (socket.connected) onConnect();
    socket.on('connect', onConnect);

    const onMessage = (m: MessageDto) => {
      // Message notifications (sound/toast/browser) are handled globally by
      // <GlobalNotifications/> so they work on any page without duplication.
      setMessages((prev) => {
        // O(1) dedup check using the last few IDs (messages arrive in order)
        if (prev.length > 0 && prev[prev.length - 1].id === m.id) return prev;
        if (prev.some((p) => p.id === m.id)) return prev;
        return [...prev, m];
      });
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
    const onReaction = (r: FloatingReactionDto) => {
      const id = `${r.userId}-${r.timestamp}-${Math.random()}`;
      const x = 20 + Math.random() * 60;
      setReactions((prev) => [...prev, { ...r, id, x }]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((p) => p.id !== id));
      }, 2600);
    };
    const onTyping = ({
      userId,
      username,
      isTyping,
    }: {
      userId: string;
      username: string;
      isTyping: boolean;
    }) => {
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
    socket.on('reaction:new', onReaction);
    socket.on('typing:update', onTyping);

    return () => {
      socket.off('connect', onConnect);
      socket.off('message:new', onMessage);
      socket.off('message:deleted', onDeleted);
      socket.off('message:read:update', onReadUpdate);
      socket.off('message:reaction:update', onReactionUpdate);
      socket.off('reaction:new', onReaction);
      socket.off('typing:update', onTyping);
      socket.emit('room:leave', { roomId });
    };
  }, [roomId, status, user]);

  const sendMessage = useCallback((content: string) => {
    sendChatMessage({ roomId, content, type: 'text' }, (e) => toast.error(e));
  }, [roomId]);

  const sendReaction = useCallback((emoji: string) => {
    getSocket().emit('reaction:send', { roomId, emoji });
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



  if (status !== 'authenticated' || !room || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
      </main>
    );
  }

  const myMember = room.members.find((m) => m.id === user.id);
  const isHost = room.ownerId === user.id;

  return (
    <main className="flex h-screen flex-col bg-bg-base relative">
      <div
        className="pointer-events-none absolute inset-0"
        style={backgroundStyle(room.background)}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <RoomHeader
          roomId={roomId}
          name={room.name}
          nickname={room.nickname}
          type={room.type}
          inviteCode={room.inviteCode}
          members={room.members}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <MessageList messages={messages} currentUserId={user.id} typing={typing} roomId={roomId} members={room.members} />
          <ChatInput
            onSend={sendMessage}
            onTypingStart={onTypingStart}
            onTypingStop={onTypingStop}
            roomId={roomId}
          />
        </div>
      </div>
      <FloatingReactions reactions={reactions} />

      <RoomSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        roomId={roomId}
        isHost={isHost}
        currentNickname={myMember?.nickname ?? null}
        currentRoomNickname={room.nickname}
        currentBackground={room.background}
        onUpdated={() => void fetchRoom()}
      />


    </main>
  );
}
