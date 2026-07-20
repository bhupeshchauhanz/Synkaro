'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Upload, Film, Trash2, Library, FileText } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';
import { getSocket, type WatchStateDto } from '@/lib/socket';
import { uploadFile, abortUpload } from '@/lib/upload';
import { SyncVideoPlayer } from './sync-video-player';
import { SyncDocumentViewer } from './sync-document-viewer';

interface UploadedFile {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize?: number | string;
  createdAt: string;
}

const CHUNK_SIZE = 4 * 1024 * 1024;
const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB per file
const MAX_ROOM_SIZE = 4 * 1024 * 1024 * 1024; // 4GB per room

function backendOrigin(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '');
}
function absoluteFileUrl(filePath: string): string {
  if (/^https?:\/\//i.test(filePath)) return filePath;
  return `${backendOrigin()}${filePath}`;
}

/**
 * The shared "watch together" stage: room library + upload + synced player.
 * Reused by the standalone /watch page AND the in-call Watch mode, so playback
 * sync, reactions and the library behave identically everywhere.
 */
export function WatchStage({
  roomId,
  currentUsername,
  libraryOnly = false,
}: {
  roomId: string;
  currentUsername: string;
  /** Room→Watch shows library + upload only; the synced player opens from a call. */
  libraryOnly?: boolean;
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeFile, setActiveFile] = useState<UploadedFile | null>(null);
  const [state, setState] = useState<WatchStateDto | null>(null);
  const [resume, setResume] = useState<{ fileId?: string; timestamp?: number } | null>(null);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const [uploadLockedBy, setUploadLockedBy] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'waiting-network' | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastWatchAction = useRef<{ by: string; at: number }>({ by: '', at: 0 });
  const lastReported = useRef<number>(0);
  const lastPos = useRef<{ fileId: string; ts: number; dur: number } | null>(null);
  const bufferingUsers = useRef<Map<string, string>>(new Map());
  const iHoldLock = useRef(false);
  const filesRef = useRef<UploadedFile[]>([]);
  useEffect(() => { filesRef.current = files; }, [files]);
  const uploadAbort = useRef<AbortController | null>(null);
  const currentUploadId = useRef<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Initial data — fetch fresh file list every time this mounts
  // (prevents stale data on back-navigation)
  useEffect(() => {
    const fetchFiles = () => {
      api.get<UploadedFile[]>(`/upload/rooms/${roomId}/files`).then((res) => setFiles(res.data)).catch(() => undefined);
    };
    fetchFiles();
    api.get<WatchStateDto | null>(`/rooms/${roomId}/watch/state`).then((res) => setState(res.data)).catch(() => undefined);
    api.get<{ fileId?: string; timestamp?: number } | null>(`/rooms/${roomId}/watch/resume`).then((res) => setResume(res.data)).catch(() => undefined);

    // Also re-fetch when the page becomes visible again (back-forward cache / tab switch)
    const onVisibility = () => {
      if (!document.hidden) fetchFiles();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', fetchFiles);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', fetchFiles);
    };
  }, [roomId]);

  // Watch sync + reactions
  useEffect(() => {
    const socket = getSocket();
    socket.emit('room:join', { roomId });
    socket.emit('watch:sync', { roomId });

    // The first state response is the initial sync (old saved state from Redis),
    // NOT a live action — so we suppress the toast for it.
    let initialSyncDone = false;

    const onState = (s: WatchStateDto) => {
      if (!initialSyncDone) {
        initialSyncDone = true;
        // Just apply the state silently — no toast for stale/initial state
        lastWatchAction.current = { by: s.updatedBy || '', at: s.updatedAt };
        setState(s);
        return;
      }

      const prev = lastWatchAction.current;
      // Only show toast for genuinely live actions (not stale state from Redis).
      // If the state update is older than 10 seconds, it's not a real-time action.
      const isLive = (Date.now() - s.updatedAt) < 10_000;
      if (isLive && s.updatedBy && s.updatedBy !== currentUsername && (prev.by !== s.updatedBy || s.updatedAt - prev.at > 1200)) {
        lastWatchAction.current = { by: s.updatedBy, at: s.updatedAt };
        toast.message(`${s.updatedBy} ${s.isPlaying ? 'resumed' : 'paused'} playback`);
      } else {
        lastWatchAction.current = { by: s.updatedBy || '', at: s.updatedAt };
      }
      setState(s);
    };
    const onReactionNew = (r: { emoji: string; timestamp: number; userId: string }) => {
      const id = `${r.userId}-${r.timestamp}-${Math.random().toString(36).slice(2, 6)}`;
      const x = 10 + Math.random() * 80;
      setReactions((prev) => [...prev, { id, emoji: r.emoji, x }]);
      setTimeout(() => setReactions((prev) => prev.filter((p) => p.id !== id)), 2600);
    };

    // Buffering coordination — track who's stalling; we wait for them
    const onRemoteBuffering = (d: { userId: string; username: string; buffering: boolean }) => {
      const m = bufferingUsers.current;
      if (d.buffering) m.set(d.userId, d.username);
      else m.delete(d.userId);
      const first = m.values().next();
      setWaitingFor(first.done ? null : first.value);
    };
    // Single-uploader lock
    const onLocked = (d: { byName: string }) => { if (!iHoldLock.current) setUploadLockedBy(d.byName); };
    const onUnlocked = () => setUploadLockedBy(null);

    // Synced video selection — when anyone opens a video, everyone opens it
    const onSelected = (d: { fileId: string | null }) => {
      if (!d.fileId) { setActiveFile(null); return; }
      const found = filesRef.current.find((f) => f.id === d.fileId);
      if (found) { setActiveFile(found); return; }
      // Just-uploaded by someone else — refetch the library then open it
      api.get<UploadedFile[]>(`/upload/rooms/${roomId}/files`).then((res) => {
        setFiles(res.data);
        const f = res.data.find((x) => x.id === d.fileId);
        if (f) setActiveFile(f);
      }).catch(() => undefined);
    };

    socket.on('watch:state', onState);
    socket.on('reaction:new', onReactionNew);
    socket.on('watch:buffering', onRemoteBuffering);
    socket.on('watch:selected', onSelected);
    socket.on('upload:locked', onLocked);
    socket.on('upload:unlocked', onUnlocked);
    return () => {
      socket.off('watch:state', onState);
      socket.off('reaction:new', onReactionNew);
      socket.off('watch:buffering', onRemoteBuffering);
      socket.off('watch:selected', onSelected);
      socket.off('upload:locked', onLocked);
      socket.off('upload:unlocked', onUnlocked);
    };
  }, [roomId, currentUsername]);

  // If the user navigates away / closes while holding the upload lock, release it
  // so it doesn't block others.
  useEffect(() => {
    const release = () => {
      // Cancel an in-flight upload (its partial chunks get cleaned on the server)
      uploadAbort.current?.abort();
      if (iHoldLock.current) {
        getSocket().emit('upload:release', { roomId });
        iHoldLock.current = false;
      }
    };
    window.addEventListener('pagehide', release);
    return () => {
      window.removeEventListener('pagehide', release);
      release();
    };
  }, [roomId]);

  const onReaction = useCallback((emoji: string) => getSocket().emit('reaction:send', { roomId, emoji }), [roomId]);
  const onBuffering = useCallback((b: boolean) => getSocket().emit('watch:buffering', { roomId, buffering: b }), [roomId]);
  const onPlay = useCallback((ts: number) => getSocket().emit('watch:play', { roomId, timestamp: ts }), [roomId]);
  const onPause = useCallback((ts: number) => getSocket().emit('watch:pause', { roomId, timestamp: ts }), [roomId]);
  const onSeek = useCallback((ts: number) => getSocket().emit('watch:seek', { roomId, timestamp: ts }), [roomId]);

  const onTimeUpdate = (ts: number, dur: number) => {
    if (!activeFile) return;
    lastPos.current = { fileId: activeFile.id, ts, dur };
    const bucket = Math.floor(ts / 5);
    if (bucket === lastReported.current) return;
    lastReported.current = bucket;
    void api.post(`/rooms/${roomId}/watch/history`, { fileId: activeFile.id, timestamp: ts, duration: dur });
  };

  // Flush the exact last position when leaving the page or closing the player
  // so "resume where you left off" is precise (not just the last 5s bucket).
  useEffect(() => {
    const flush = () => {
      const p = lastPos.current;
      if (!p || p.ts < 5) return;
      const base = (process.env.NEXT_PUBLIC_API_URL ?? '/api').replace(/\/$/, '');
      const url = `${base}/rooms/${roomId}/watch/history`;
      // Auth is cookie-based (withCredentials), so a keepalive fetch with
      // credentials survives navigation and still authenticates.
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fileId: p.fileId, timestamp: p.ts, duration: p.dur }),
        keepalive: true,
      }).catch(() => undefined);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [roomId]);

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reset = () => { if (fileInput.current) fileInput.current.value = ''; };
    if (/\.(mkv|avi|mov|flv|wmv)$/i.test(file.name) || file.type === 'video/x-matroska') {
      toast.error('This video format can\u2019t play in the browser. Please upload an MP4 or WebM file.');
      return reset();
    }
    const isDoc = file.type === 'application/pdf' ||
      file.type === 'application/vnd.ms-powerpoint' ||
      file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      /\.(pdf|ppt|pptx)$/i.test(file.name);
    const isVideo = file.type.startsWith('video/');
    if (!isVideo && !isDoc) {
      toast.error('Only MP4, WebM, PDF, and PPT/PPTX files are allowed.');
      return reset();
    }
    const maxSize = isDoc ? 200 * 1024 * 1024 : MAX_FILE_SIZE; // 200MB for docs, 3GB for video
    if (file.size > maxSize) {
      toast.error(isDoc ? 'Documents must be under 200MB.' : 'Only 3GB is allowed per video. This file is too large.');
      return reset();
    }
    const usedBytes = files.reduce((sum, f) => sum + Number(f.fileSize ?? 0), 0);
    if (usedBytes + file.size > MAX_ROOM_SIZE) {
      const freeGb = Math.max(0, (MAX_ROOM_SIZE - usedBytes) / (1024 * 1024 * 1024));
      toast.error(`Room storage is almost full (4GB max). Only ${freeGb.toFixed(1)}GB free — delete a video first.`);
      return reset();
    }

    // Single-uploader lock: only one person can upload at a time per room
    const claim = await new Promise<{ ok: boolean; byName?: string }>((resolve) => {
      getSocket().timeout(5000).emit('upload:claim', { roomId }, (err: Error | null, res?: { ok: boolean; byName?: string }) => {
        resolve(err ? { ok: false } : res ?? { ok: false });
      });
    });
    if (!claim.ok) {
      toast.error(`${claim.byName || 'Someone'} is uploading right now. Please wait for them to finish.`);
      return reset();
    }
    iHoldLock.current = true;

    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    currentUploadId.current = uploadId;
    const ac = new AbortController();
    uploadAbort.current = ac;

    setUploading(true);
    setProgress(0);
    setUploadStatus('uploading');
    try {
      const result = await uploadFile({
        file,
        roomId,
        uploadId,
        chunkSize: CHUNK_SIZE,
        signal: ac.signal,
        onProgress: setProgress,
        onStatus: setUploadStatus,
      });
      setFiles((prev) => [result, ...prev]);
      setActiveFile(result);
      toast.success('Upload complete');
    } catch (err) {
      const aborted = (err as Error)?.name === 'AbortError';
      // Discard the partial upload's chunks from the server (any %)
      void abortUpload(uploadId);
      toast.error(aborted ? 'Upload failed — interrupted. The partial file was discarded.' : getApiError(err).error);
    } finally {
      setUploading(false);
      setProgress(0);
      setUploadStatus(null);
      iHoldLock.current = false;
      uploadAbort.current = null;
      currentUploadId.current = null;
      getSocket().emit('upload:release', { roomId });
      reset();
    }
  };

  const deleteFile = (fileId: string) => {
    // Remove from UI immediately
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (activeFile?.id === fileId) setActiveFile(null);

    // Delete on server immediately — no delayed commit
    // This ensures navigating away doesn't leave a ghost file
    api.delete(`/upload/files/${fileId}`).catch((err) => {
      toast.error(getApiError(err).error);
      // If delete failed, re-fetch to restore correct state
      api.get<UploadedFile[]>(`/upload/rooms/${roomId}/files`).then((res) => setFiles(res.data)).catch(() => undefined);
    });

    toast.success('Video deleted');
  };

  if (activeFile) {
    const isDocument = /\.(pdf|ppt|pptx)$/i.test(activeFile.fileName) ||
      activeFile.mimeType === 'application/pdf' ||
      activeFile.mimeType === 'application/vnd.ms-powerpoint' ||
      activeFile.mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    return (
      <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
        <div className="w-full h-full max-h-full flex items-center justify-center">
          {isDocument ? (
            <SyncDocumentViewer
              src={absoluteFileUrl(activeFile.filePath)}
              fileName={activeFile.fileName}
              roomId={roomId}
              state={state}
            />
          ) : (
            <SyncVideoPlayer
              src={absoluteFileUrl(activeFile.filePath)}
              state={state}
              resumeTime={resume && resume.fileId === activeFile.id ? resume.timestamp : undefined}
              floatingReactions={reactions}
              waitingFor={waitingFor}
              onReaction={onReaction}
              onBuffering={onBuffering}
              onPlay={onPlay}
              onPause={onPause}
              onSeek={onSeek}
              onTimeUpdate={onTimeUpdate}
            />
          )}
        </div>
        <button
          onClick={() => setActiveFile(null)}
          className="absolute top-3 left-3 z-30 flex items-center gap-1.5 rounded-pill border border-white/20 bg-black/50 px-3 py-1 text-xs text-white/90 hover:bg-black/70 transition-colors"
        >
          <Library className="h-3 w-3" /> Library
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <div className="card">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.06] border border-white/[0.08]">
              <Upload className="h-4 w-4 text-text-primary" strokeWidth={1.75} />
            </div>
            <h3 className="font-display text-lg font-semibold tracking-tight">Upload Video</h3>
          </div>
          <p className="mt-1 text-xs text-text-tertiary">
            MP4, WebM, PDF or PPT/PPTX. Videos: 3GB limit. Documents: 200MB. Room total: 4GB.
          </p>
          <input ref={fileInput} type="file" accept="video/mp4,video/webm,application/pdf,.ppt,.pptx" onChange={onFileSelect} className="hidden" />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading || !!uploadLockedBy}
            className="btn-ghost mt-4 w-full text-xs disabled:opacity-50"
          >
            {uploading ? (
              uploadStatus === 'waiting-network' ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Network lost — waiting to resume…</>
              ) : (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading {progress.toFixed(0)}%</>
              )
            ) : uploadLockedBy ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {uploadLockedBy} is uploading…</>
            ) : (
              <><Upload className="h-3.5 w-3.5" /> Choose a file</>
            )}
          </button>
          {uploading ? (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-pill bg-white/[0.06]">
              <div className="h-full bg-white transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </div>

        <h3 className="mt-8 mb-4 text-xs uppercase tracking-wider font-medium text-text-tertiary">Room library</h3>
        {files.length === 0 ? (
          <p className="text-sm text-text-tertiary">No videos yet. Upload one to start watching together.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {files.map((f) => {
              const expiry = new Date(f.createdAt).getTime() + 6 * 60 * 60 * 1000;
              const timeLeftMs = Math.max(0, expiry - now);
              const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
              const minsLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
              const timeLeftStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m left` : `${minsLeft}m left`;
              return (
                <div key={f.id} className="card-hover text-left transition-all p-3 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (libraryOnly) {
                        toast.message('Start a call and open Watch to play together');
                        return;
                      }
                      setActiveFile(f);
                      // Open the same video for everyone in the room
                      getSocket().emit('watch:select', { roomId, fileId: f.id });
                    }}
                    className="flex items-center gap-3 overflow-hidden flex-1 text-left"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-bg-elevated border border-white/[0.08]">
                      {/\.(pdf|ppt|pptx)$/i.test(f.fileName) ? (
                        <FileText className="h-3.5 w-3.5 text-text-secondary" />
                      ) : (
                        <Film className="h-3.5 w-3.5 text-text-secondary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.fileName}</p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">{timeLeftMs > 0 ? `Auto-deletes in ${timeLeftStr}` : 'Deleting soon...'}</p>
                    </div>
                  </button>
                  <button onClick={() => deleteFile(f.id)} className="p-2 ml-2 text-text-tertiary hover:text-danger hover:bg-danger/10 rounded-md transition-colors" title="Delete video">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
