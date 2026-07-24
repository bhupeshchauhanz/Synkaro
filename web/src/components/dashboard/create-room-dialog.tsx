'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, Heart, Users } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';

interface RoomSummary {
  id: string;
  name: string;
  type: 'couple' | 'friend';
  inviteCode: string;
  currentTheme: string;
  members: { id: string; username: string; avatar: string | null }[];
  messageCount: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (room: RoomSummary) => void;
}

export function CreateRoomDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'couple' | 'friend'>('friend');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post<{
        id: string;
        name: string;
        type: 'couple' | 'friend';
        inviteCode: string;
        currentTheme: string;
      }>('/rooms', { name, type });
      onCreated({
        id: res.data.id,
        name: res.data.name,
        type: res.data.type,
        inviteCode: res.data.inviteCode,
        currentTheme: res.data.currentTheme,
        members: [],
        messageCount: 0,
      });
      toast.success('Room created');
      onOpenChange(false);
      setName('');
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-md my-auto"
                >
                <div className="card relative">
                  <Dialog.Close asChild>
                    <button
                      className="absolute right-4 top-4 text-text-tertiary hover:text-text-primary transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                  <Dialog.Title className="font-display text-2xl font-bold tracking-tight">
                    Create a room
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-text-secondary">
                    Pick the vibe. We'll generate an invite code.
                  </Dialog.Description>
                  <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                        Room name
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        maxLength={40}
                        placeholder="Movie night"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                        Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setType('couple')}
                          className={`flex flex-col items-start gap-2 rounded-md border p-3 text-left transition-all ${
                            type === 'couple'
                              ? 'border-white/40 bg-white/5'
                              : 'border-white/[0.08] bg-bg-input hover:border-white/[0.14]'
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded ${
                              type === 'couple'
                                ? 'bg-white/15 text-white'
                                : 'bg-bg-elevated text-text-tertiary'
                            }`}
                          >
                            <Heart className="h-3.5 w-3.5" fill="currentColor" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-primary">Couple</div>
                            <div className="text-xs text-text-tertiary">Just the two of you</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setType('friend')}
                          className={`flex flex-col items-start gap-2 rounded-md border p-3 text-left transition-all ${
                            type === 'friend'
                              ? 'border-white/40 bg-white/5'
                              : 'border-white/[0.08] bg-bg-input hover:border-white/[0.14]'
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded ${
                              type === 'friend'
                                ? 'bg-white/15 text-white'
                                : 'bg-bg-elevated text-text-tertiary'
                            }`}
                          >
                            <Users className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-primary">Friends</div>
                            <div className="text-xs text-text-tertiary">Up to 6 people</div>
                          </div>
                        </button>
                      </div>
                    </div>
                    <button type="submit" disabled={submitting} className="btn-primary w-full">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create room'}
                    </button>
                  </form>
                </div>
                </motion.div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
