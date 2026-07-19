'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: (roomId: string) => void;
}

export function JoinRoomDialog({ open, onOpenChange, onJoined }: Props) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post<{ roomId: string }>('/rooms/join', {
        inviteCode: code.toUpperCase(),
      });
      toast.success('Joined room');
      onJoined(res.data.roomId);
      onOpenChange(false);
      setCode('');
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
                className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="w-full max-w-md my-auto"
                >
                <div className="card relative">
                  <Dialog.Close asChild>
                    <button
                      className="absolute right-4 top-4 text-text-tertiary hover:text-text-primary"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                  <Dialog.Title className="font-display text-2xl font-bold tracking-tight">
                    Join a room
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-text-secondary">
                    Enter the 6-character invite code.
                  </Dialog.Description>
                  <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={8}
                      placeholder="ABCD12"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="input text-center font-mono text-2xl uppercase tracking-[0.5em]"
                    />
                    <button type="submit" disabled={submitting} className="btn-primary w-full">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join room'}
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
