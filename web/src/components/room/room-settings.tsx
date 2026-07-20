'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Upload, X, Check, Trash2, AlertTriangle, LogOut } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';

export const ROOM_BACKGROUNDS: { id: string; label: string; gradient: string }[] = [
  {
    id: 'preset:aurora',
    label: 'Aurora',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f23 50%, #16213e 100%)',
  },
  {
    id: 'preset:midnight',
    label: 'Midnight',
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #000000 100%)',
  },
  {
    id: 'preset:steel',
    label: 'Steel',
    gradient: 'linear-gradient(135deg, #1c1c1c 0%, #2d2d2d 50%, #1a1a1a 100%)',
  },
  {
    id: 'preset:smoke',
    label: 'Smoke',
    gradient: 'linear-gradient(135deg, #232323 0%, #111111 100%)',
  },
  {
    id: 'preset:carbon',
    label: 'Carbon',
    gradient: 'linear-gradient(135deg, #191919 0%, #0d0d0d 50%, #1a1a1a 100%)',
  },
  {
    id: 'preset:sunset',
    label: 'Sunset',
    gradient: 'linear-gradient(135deg, #2d1b3d 0%, #1a0a2e 50%, #0d0d1a 100%)',
  },
  {
    id: 'preset:ocean',
    label: 'Ocean',
    gradient: 'linear-gradient(135deg, #0a192f 0%, #112240 50%, #0a192f 100%)',
  },
  {
    id: 'preset:forest',
    label: 'Forest',
    gradient: 'linear-gradient(135deg, #0a1a0a 0%, #0d2818 50%, #0a1a0a 100%)',
  },
  {
    id: 'preset:ember',
    label: 'Ember',
    gradient: 'linear-gradient(135deg, #1a0a0a 0%, #2d1111 50%, #1a0a0a 100%)',
  },
];

export const ALL_BACKGROUNDS = ROOM_BACKGROUNDS;

export interface RoomSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  isHost: boolean;
  currentNickname: string | null;
  currentRoomNickname: string | null;
  currentBackground: string | null;
  onUpdated: () => void;
}

export function RoomSettings({
  open,
  onOpenChange,
  roomId,
  isHost,
  currentNickname,
  currentRoomNickname,
  currentBackground,
  onUpdated,
}: RoomSettingsProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'general' | 'background'>('general');
  const [myNick, setMyNick] = useState(currentNickname ?? '');
  const [roomNick, setRoomNick] = useState(currentRoomNickname ?? '');
  const [background, setBackground] = useState(currentBackground ?? 'preset:midnight');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMyNick(currentNickname ?? '');
    setRoomNick(currentRoomNickname ?? '');
    setBackground(currentBackground ?? 'preset:midnight');
    setTab('general');
    setConfirmDelete(false);
    setConfirmLeave(false);
    setIsMuted(localStorage.getItem(`synkaro:mute:${roomId}`) === 'true');
  }, [open, currentNickname, currentRoomNickname, currentBackground, roomId]);

  const saveMyNickname = async () => {
    setSaving(true);
    try {
      await api.patch(`/rooms/${roomId}/nickname`, { nickname: myNick });
      toast.success('Your nickname updated');
      onUpdated();
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setSaving(false);
    }
  };

  const saveHostUpdates = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (roomNick !== (currentRoomNickname ?? '')) body.nickname = roomNick;
      if (background !== (currentBackground ?? '')) body.background = background;
      if (Object.keys(body).length > 0) {
        await api.patch(`/rooms/${roomId}`, body);
        toast.success('Room updated');
        onUpdated();
      }
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setSaving(false);
    }
  };

  const onUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(f.type)) {
      toast.error('Only JPG and PNG allowed');
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      toast.error('Image must be under 4 MB');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', f);
      const res = await api.post<{ background: string }>(
        `/rooms/${roomId}/background`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setBackground(res.data.background);
      toast.success('Background uploaded');
      onUpdated();
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const onDeleteRoom = async () => {
    setDeleting(true);
    try {
      await api.delete(`/rooms/${roomId}`);
      toast.success('Room deleted');
      onOpenChange(false);
      router.push('/dashboard');
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setDeleting(false);
    }
  };

  const onLeaveRoom = async () => {
    setLeaving(true);
    try {
      await api.post(`/rooms/${roomId}/leave`);
      toast.success('Left the room');
      onOpenChange(false);
      router.push('/dashboard');
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setLeaving(false);
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
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
                onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
              >
                <div className="card relative w-full max-w-2xl my-auto" onClick={(e) => e.stopPropagation()}>
                  <Dialog.Close asChild>
                    <button
                      className="absolute right-4 top-4 text-text-tertiary hover:text-text-primary"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>

                  <Dialog.Title className="font-display text-2xl font-bold tracking-tight">
                    Room settings
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-text-secondary">
                    Personalize how this room feels.
                  </Dialog.Description>

                  <div className="mt-6 flex items-center gap-1 rounded-pill border border-white/[0.08] bg-bg-input p-1">
                    {([
                      { id: 'general', label: 'General' },
                      { id: 'background', label: 'Background' },
                    ] as const).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 rounded-pill px-4 py-1.5 text-xs font-medium transition-all ${
                          tab === t.id
                            ? 'bg-white text-black'
                            : 'text-text-tertiary hover:text-text-primary'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 max-h-[65vh] overflow-y-auto pr-1 -mr-1">
                    {tab === 'general' ? (
                      <div className="space-y-5">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                            Your nickname in this room
                          </label>
                          <div className="flex gap-2">
                            <input
                              value={myNick}
                              onChange={(e) => setMyNick(e.target.value)}
                              maxLength={24}
                              placeholder="What should others call you?"
                              className="input flex-1"
                            />
                            <button
                              onClick={saveMyNickname}
                              disabled={saving}
                              className="btn-ghost text-xs"
                            >
                              Save
                            </button>
                          </div>
                          <p className="mt-1.5 text-[11px] text-text-tertiary">
                            Visible only inside this room. Empty to use your real username.
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] p-4 bg-bg-input">
                          <div>
                            <p className="text-sm font-medium text-text-primary">Mute notifications</p>
                            <p className="text-[11px] text-text-tertiary mt-0.5">Don't show popups for new messages</p>
                          </div>
                          <button
                            onClick={() => {
                              const next = !isMuted;
                              setIsMuted(next);
                              if (next) localStorage.setItem(`synkaro:mute:${roomId}`, 'true');
                              else localStorage.removeItem(`synkaro:mute:${roomId}`);
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out ${
                              isMuted ? 'bg-primary' : 'bg-white/[0.1]'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                                isMuted ? 'translate-x-4' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {isHost ? (
                          <>
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                                Room nickname (host only)
                              </label>
                              <input
                                value={roomNick}
                                onChange={(e) => setRoomNick(e.target.value)}
                                maxLength={30}
                                placeholder="e.g. Our Sunday cinema"
                                className="input"
                              />
                              <p className="mt-1.5 text-[11px] text-text-tertiary">
                                A friendly name for the room. Doesn&apos;t change the URL.
                              </p>
                            </div>

                            <button
                              onClick={saveHostUpdates}
                              disabled={saving}
                              className="btn-primary text-xs"
                            >
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save changes'}
                            </button>
                          </>
                        ) : null}

                        {/* Danger zone — host sees delete, members see leave */}
                        <div className="pt-5 mt-5 border-t border-white/[0.06]">
                          <p className="text-xs font-semibold uppercase tracking-wider text-danger/80 mb-3">
                            Danger zone
                          </p>
                          {isHost ? (
                            <>
                              {!confirmDelete ? (
                                <button
                                  onClick={() => setConfirmDelete(true)}
                                  className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs font-medium text-danger hover:bg-danger/10 transition-colors w-full"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete this room
                                </button>
                              ) : (
                                <div className="rounded-md border border-danger/30 bg-danger/5 p-4">
                                  <div className="flex gap-2.5">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-danger mt-0.5" />
                                    <div className="text-xs text-text-primary">
                                      <p className="font-semibold text-danger mb-1">Delete this room?</p>
                                      <p className="text-text-secondary leading-relaxed">
                                        This permanently removes the room, all messages, uploaded files
                                        and watch history. This action cannot be undone.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-4">
                                    <button
                                      onClick={() => setConfirmDelete(false)}
                                      disabled={deleting}
                                      className="btn-ghost text-xs flex-1"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={onDeleteRoom}
                                      disabled={deleting}
                                      className="btn-danger flex-1 text-xs"
                                    >
                                      {deleting ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <>
                                          <Trash2 className="h-3.5 w-3.5" /> Yes, delete
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {!confirmLeave ? (
                                <button
                                  onClick={() => setConfirmLeave(true)}
                                  className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs font-medium text-danger hover:bg-danger/10 transition-colors w-full"
                                >
                                  <LogOut className="h-3.5 w-3.5" /> Leave this room
                                </button>
                              ) : (
                                <div className="rounded-md border border-danger/30 bg-danger/5 p-4">
                                  <div className="flex gap-2.5">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-danger mt-0.5" />
                                    <div className="text-xs text-text-primary">
                                      <p className="font-semibold text-danger mb-1">Leave this room?</p>
                                      <p className="text-text-secondary leading-relaxed">
                                        You&apos;ll lose access until someone invites you back.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-4">
                                    <button
                                      onClick={() => setConfirmLeave(false)}
                                      disabled={leaving}
                                      className="btn-ghost text-xs flex-1"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={onLeaveRoom}
                                      disabled={leaving}
                                      className="btn-danger flex-1 text-xs"
                                    >
                                      {leaving ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        'Yes, leave'
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {tab === 'background' ? (
                      <div className="space-y-4">
                        <p className="text-xs text-text-tertiary">
                          Choose a preset or upload your own (JPG/PNG, up to 4 MB).
                        </p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {ROOM_BACKGROUNDS.map((bg) => (
                            <BackgroundCard
                              key={bg.id}
                              bg={bg}
                              selected={background === bg.id}
                              isHost={isHost}
                              onClick={() => isHost && setBackground(bg.id)}
                            />
                          ))}
                          {background.startsWith('/uploads/') ? (
                            <button
                              disabled={!isHost}
                              className="relative aspect-video overflow-hidden rounded-md border-2 border-white"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={background}
                                alt="custom"
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                              <span className="absolute left-2 top-2 rounded-pill bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-white">
                                Custom
                              </span>
                            </button>
                          ) : null}
                        </div>

                        {isHost ? (
                          <>
                            <input
                              ref={fileInput}
                              type="file"
                              accept="image/png,image/jpeg"
                              onChange={onUploadBg}
                              className="hidden"
                            />
                            <button
                              onClick={() => fileInput.current?.click()}
                              disabled={uploading}
                              className="btn-ghost w-full text-xs"
                            >
                              {uploading ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-3.5 w-3.5" /> Upload custom background
                                </>
                              )}
                            </button>
                            <button
                              onClick={saveHostUpdates}
                              disabled={saving}
                              className="btn-primary w-full text-xs"
                            >
                              {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                'Apply background'
                              )}
                            </button>
                          </>
                        ) : (
                          <p className="text-xs text-text-tertiary">
                            Only the room host can change the background.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function BackgroundCard({
  bg,
  selected,
  isHost,
  onClick,
}: {
  bg: { id: string; label: string; gradient: string };
  selected: boolean;
  isHost: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!isHost}
      onClick={onClick}
      aria-disabled={!isHost}
      className={`group relative aspect-video overflow-hidden rounded-md border-2 transition-all ${
        selected
          ? 'border-white ring-2 ring-white/20'
          : isHost ? 'border-transparent hover:border-white/30' : 'border-transparent'
      } ${!isHost ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <div className="absolute inset-0" style={{ background: bg.gradient }} />
      <div className="absolute inset-0 flex items-center justify-between px-3">
        <span className="rounded-pill bg-black/50 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-white">
          {bg.label}
        </span>
        {selected ? (
          <span className="rounded-full bg-white p-1">
            <Check className="h-3 w-3 text-black" strokeWidth={3} />
          </span>
        ) : null}
      </div>
    </button>
  );
}
