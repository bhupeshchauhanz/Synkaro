'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCheck, Phone, Sparkles, X } from 'lucide-react';
import type { MessageDto } from '@/lib/socket';
import { getSocket } from '@/lib/socket';

const REACTION_EMOJIS = ['❤️', '😂', '😭', '🫶', '😘', '🔥', '👍', '👏'];

// Progressive read-more thresholds (word counts)
const READ_MORE_THRESHOLDS = [250, 500, 700];

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function truncateToWords(text: string, wordCount: number): string {
  const words = text.split(/\s+/);
  if (words.length <= wordCount) return text;
  return words.slice(0, wordCount).join(' ');
}

/** Progressive "read more" text component: 250 → 500 → 700 words */
function ReadMoreText({ text }: { text: string }) {
  const totalWords = countWords(text);
  const [expandLevel, setExpandLevel] = useState(0); // 0 = initial, 1 = first expand, etc.

  // Find the appropriate threshold
  const currentThreshold = READ_MORE_THRESHOLDS[expandLevel] ?? totalWords;
  const needsTruncation = totalWords > READ_MORE_THRESHOLDS[0];
  const isFullyExpanded = currentThreshold >= totalWords;
  const nextThreshold = READ_MORE_THRESHOLDS[expandLevel + 1];

  if (!needsTruncation || isFullyExpanded) {
    return <span className="break-words whitespace-pre-wrap overflow-wrap-anywhere">{text}</span>;
  }

  const displayText = truncateToWords(text, currentThreshold);
  const remainingWords = totalWords - currentThreshold;

  return (
    <span className="break-words whitespace-pre-wrap overflow-wrap-anywhere">
      {displayText}{' '}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpandLevel((prev) => prev + 1);
        }}
        className="inline font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
      >
        ...read more ({nextThreshold && nextThreshold < totalWords
          ? `+${Math.min(nextThreshold, totalWords) - currentThreshold}`
          : remainingWords} words)
      </button>
    </span>
  );
}

function formatStamp(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function shouldGroupWithPrevious(curr: MessageDto, prev: MessageDto | undefined): boolean {
  if (!prev) return false;
  if (prev.senderId !== curr.senderId) return false;
  const a = new Date(prev.createdAt).getTime();
  const b = new Date(curr.createdAt).getTime();
  return b - a < 60_000;
}

export function MessageList({
  messages,
  currentUserId,
  typing,
  roomId,
  members = [],
  disableLightbox = false,
  onScroll,
}: {
  messages: MessageDto[];
  currentUserId: string;
  typing: { userId: string; username: string }[];
  roomId: string;
  members?: { id: string; username: string }[];
  disableLightbox?: boolean;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}) {
  const nameFor = (id: string) =>
    id === currentUserId ? 'You' : members.find((m) => m.id === id)?.username ?? 'Someone';
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null); // image URL shown fullscreen
  const [reactionSheet, setReactionSheet] = useState<string | null>(null); // messageId whose reactions are shown

  // No merged ref needed — onScroll callback gives parent access to scroll position

  useEffect(() => {
    // Auto-scroll to bottom only if user is already near the bottom (within 200px).
    // This prevents forcing the user back down when they're reading old messages.
    const el = containerRef.current;
    if (el) {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (isNearBottom) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages, typing.length]);

  useEffect(() => {
    // Auto-mark only the LATEST unread message as read (not all messages).
    // This prevents flooding socket with hundreds of read events on load.
    const lastUnread = [...messages].reverse().find((m) => {
      if (m.senderId === currentUserId) return false;
      const meta = m.metadata as { readBy?: string[] } | null;
      return !meta?.readBy?.includes(currentUserId);
    });
    if (lastUnread) {
      getSocket().emit('message:read', { roomId, messageId: lastUnread.id });
    }
  }, [messages, currentUserId, roomId]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, messageId: string) => {
    e.preventDefault();
    const clientX = 'clientX' in e ? e.clientX : (e as React.TouchEvent).touches?.[0]?.clientX ?? 0;
    const clientY = 'clientY' in e ? e.clientY : (e as React.TouchEvent).touches?.[0]?.clientY ?? 0;
    // Clamp position so the menu never goes outside the viewport
    const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
    const menuW = 220; // approximate menu width
    const menuH = 160; // approximate menu height
    const x = Math.max(8, Math.min(clientX, vw - menuW));
    const y = Math.max(8, Math.min(clientY, vh - menuH));
    setContextMenu({ messageId, x, y });
  };

  const handleLongPress = (messageId: string) => {
    // Open reaction sheet directly on long-press for mobile
    setReactionSheet(messageId);
  };

  const sendReaction = useCallback((emoji: string) => {
    if (!contextMenu) return;
    getSocket().emit('message:react', { roomId, messageId: contextMenu.messageId, emoji });
    setContextMenu(null);
  }, [contextMenu, roomId]);

  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    getSocket().emit('message:react', { roomId, messageId, emoji });
  }, [roomId]);

  const deleteMessage = useCallback(() => {
    if (!contextMenu) return;
    getSocket().emit('message:delete', { roomId, messageId: contextMenu.messageId });
    setContextMenu(null);
  }, [contextMenu, roomId]);

  return (
    <div ref={containerRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 relative z-0">
      <div className="bg-chat-pattern" />
      {/* WhatsApp-style subtle pattern background */}
      <div className="mx-auto max-w-3xl space-y-0.5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-white/[0.08]">
              <Sparkles className="h-7 w-7 text-purple-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-text-primary">It's quiet in here...</p>
            <p className="mt-1 text-xs text-text-tertiary">
              Send a message to start the conversation.
            </p>
          </div>
        ) : null}
        {messages.map((m, i) => {
          const own = m.senderId === currentUserId;
          const grouped = shouldGroupWithPrevious(m, messages[i - 1]);
          const isImage = m.type === 'image' || m.type === 'gif';
          const isCallRecord = !!(m.metadata as { callRecord?: boolean } | null)?.callRecord;

          // Call logs render as a centered system chip (WhatsApp-style)
          if (isCallRecord) {
            return (
              <div key={m.id} className="my-2 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-text-tertiary">
                  <Phone className="h-3 w-3 text-success/70" />
                  {m.content}
                </span>
              </div>
            );
          }

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex ${own ? 'justify-end' : 'justify-start'} ${
                grouped ? 'mt-0.5' : 'mt-3'
              } group relative`}
              onContextMenu={(e) => handleContextMenu(e, m.id)}
              onDoubleClick={() => handleLongPress(m.id)}
            >
              

              <div className={`flex max-w-[75%] md:max-w-[55%] flex-col ${own ? 'items-end' : 'items-start'}`}>
                {!grouped && !own ? (
                  <span className="mb-0.5 ml-1 text-xs font-medium text-text-tertiary">
                    {m.username}
                  </span>
                ) : null}
                {isImage && m.fileUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-border max-w-[260px] md:max-w-[320px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.fileUrl}
                      alt="shared media"
                      onClick={() => !disableLightbox && m.fileUrl && setLightbox(m.fileUrl)}
                      className={`w-full max-h-48 md:max-h-64 rounded-xl object-cover ${disableLightbox ? '' : 'cursor-zoom-in'}`}
                    />
                    {m.content ? (
                      <div className="px-3 py-2 bg-bg-elevated/90 backdrop-blur-sm">
                        <p className="text-sm text-text-primary leading-relaxed">{m.content}</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed shadow-sm overflow-hidden break-words ${
                      own
                        ? 'bg-white text-black rounded-tr-sm'
                        : 'bg-white/[0.9] text-black rounded-tl-sm'
                    }`}
                  >
                    {m.content ? <ReadMoreText text={m.content} /> : null}
                  </div>
                )}
                {/* Persisted reactions stuck under the message (WhatsApp-style) */}
                {(() => {
                  const reactions = (m.metadata as { reactions?: Record<string, string[]> } | null)?.reactions;
                  if (!reactions || Object.keys(reactions).length === 0) return null;
                  return (
                    <div className={`mt-1 flex flex-wrap gap-1 ${own ? 'justify-end mr-1' : 'ml-1'}`}>
                      {Object.entries(reactions).map(([emoji, ids]) => {
                        if (!ids?.length) return null;
                        const mine = ids.includes(currentUserId);
                        // Show first reactor's name for context (WhatsApp-style)
                        const firstName = ids.length === 1 ? nameFor(ids[0]) : null;
                        return (
                          <button
                            key={emoji}
                            onClick={() => setReactionSheet(m.id)}
                            title={ids.map((id) => nameFor(id)).join(', ')}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-all active:scale-90 ${
                              mine
                                ? 'border border-blue-400/40 bg-blue-500/15 text-white shadow-sm'
                                : 'border border-white/10 bg-white/[0.06] text-text-secondary hover:bg-white/10'
                            }`}
                          >
                            <span className="leading-none">{emoji}</span>
                            {firstName ? (
                              <span className="font-medium leading-none max-w-[60px] truncate">{firstName}</span>
                            ) : (
                              <span className="font-medium leading-none">{ids.length}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Timestamp + read receipts */}
                <div className={`flex items-center gap-1 mt-0.5 ${own ? 'flex-row-reverse mr-1' : 'ml-1'}`}>
                  <span className="text-[10px] text-text-muted">
                    {formatStamp(m.createdAt)}
                  </span>
                  {own ? (
                    (m.metadata as { readBy?: string[] })?.readBy?.length ? (
                      <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                    ) : (
                      <CheckCheck className="h-3.5 w-3.5 text-text-muted" />
                    )
                  ) : null}
                </div>
              </div>
            </motion.div>
          );
        })}
        {typing.length > 0 ? (
          <div className="mt-3 flex justify-start">
            <div className="flex items-center rounded-2xl rounded-tl-sm border border-white/[0.06] bg-white/[0.08] px-4 py-2.5 backdrop-blur-md">
              <span className="text-xs font-medium text-text-tertiary mr-2">
                {typing.length === 1
                  ? typing[0]?.username
                  : typing.length === 2
                    ? `${typing[0]?.username} and ${typing[1]?.username} are typing...`
                    : 'Multiple people are typing...'}
              </span>
              <span className="flex gap-0.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary" />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed z-50"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="rounded-2xl border border-white/[0.1] bg-[#1c1c1e]/98 backdrop-blur-2xl shadow-2xl overflow-hidden w-[200px]">
              {/* Quick reactions row */}
              <div className="px-3 pt-3 pb-2">
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => sendReaction(emoji)}
                      aria-label={`React with ${emoji}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-all hover:bg-white/[0.1] hover:scale-125 active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              {messages.find((m) => m.id === contextMenu.messageId)?.senderId === currentUserId && (
                <>
                  <div className="mx-3 h-px bg-white/[0.08]" />
                  <button
                    onClick={deleteMessage}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-danger hover:bg-white/[0.05] transition-colors"
                  >
                    Delete message
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Image lightbox — tap an image to view large, X to close */}
      <AnimatePresence>
        {lightbox && !disableLightbox ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 md:p-8"
            onClick={() => setLightbox(null)}
          >
            {/* Close button — always visible, top-right, large tap target */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors shadow-xl backdrop-blur-sm"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt="shared media"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[75vh] max-w-[90vw] md:max-h-[82vh] md:max-w-[80vw] rounded-xl object-contain select-none shadow-2xl"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Reactions detail sheet — who reacted + tap to add/remove your own */}
      <AnimatePresence>
        {reactionSheet ? (() => {
          const msg = messages.find((m) => m.id === reactionSheet);
          const reactions = (msg?.metadata as { reactions?: Record<string, string[]> } | null)?.reactions ?? {};
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center p-0 sm:p-4"
              onClick={() => setReactionSheet(null)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md max-h-[70vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/[0.1] bg-[#1c1c1e] shadow-2xl overflow-hidden"
              >
                {/* Handle bar (mobile) */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                  <div className="h-1 w-10 rounded-full bg-white/20" />
                </div>

                <div className="px-4 pt-2 pb-3 flex items-center justify-between border-b border-white/[0.08]">
                  <h3 className="text-sm font-semibold">Reactions</h3>
                  <button onClick={() => setReactionSheet(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-white/[0.08] transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Quick react row — tap to add/remove your reaction */}
                <div className="px-4 py-3 flex flex-wrap items-center justify-center gap-1 border-b border-white/[0.08]">
                  {REACTION_EMOJIS.map((emoji) => {
                    const mine = (reactions[emoji] ?? []).includes(currentUserId);
                    return (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(reactionSheet, emoji)}
                        aria-label={`React with ${emoji}`}
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition-all hover:scale-110 active:scale-90 ${
                          mine ? 'bg-blue-500/20 ring-1 ring-blue-400/50' : 'hover:bg-white/[0.08]'
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>

                {/* Who reacted */}
                <div className="flex-1 overflow-y-auto px-4 py-2">
                  {Object.keys(reactions).length === 0 ? (
                    <p className="py-6 text-center text-xs text-text-tertiary">No reactions yet.</p>
                  ) : (
                    <div className="space-y-0.5">
                      {Object.entries(reactions).flatMap(([emoji, ids]) =>
                        (ids ?? []).map((id) => (
                          <div key={`${emoji}-${id}`} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-white/[0.04]">
                            <span className="text-sm text-text-primary">{nameFor(id)}</span>
                            <span className="text-lg">{emoji}</span>
                          </div>
                        )),
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })() : null}
      </AnimatePresence>
    </div>
  );
}
