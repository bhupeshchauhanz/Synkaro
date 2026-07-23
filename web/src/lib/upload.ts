import { api } from './api';

interface UploadFileArgs {
  file: File;
  roomId: string;
  uploadId: string;
  chunkSize: number;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  onStatus?: (status: 'uploading' | 'waiting-network') => void;
}

interface UploadedFileResponse {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize?: number | string;
  createdAt: string;
}

const MAX_OFFLINE_WAIT_MS = 120_000; // wait up to 2 minutes for the network to return

/** Resolve true once the browser is back online, or false after maxMs. */
function waitForOnline(maxMs: number, signal?: AbortSignal): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (v: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener('online', onOnline);
      signal?.removeEventListener('abort', onAbort);
      resolve(v);
    };
    const onOnline = () => done(true);
    const onAbort = () => done(false);
    const timer = setTimeout(() => done(typeof navigator !== 'undefined' && navigator.onLine), maxMs);
    window.addEventListener('online', onOnline);
    signal?.addEventListener('abort', onAbort);
  });
}

/**
 * Chunked, resumable upload:
 *  - Chunks stream from the File (Blob.slice is lazy — low browser RAM).
 *  - Transient failures retry a few times.
 *  - If the network drops mid-upload, it PAUSES (up to 2 min) and resumes from
 *    the same chunk when the connection returns (server keeps prior chunks).
 *  - Aborting (user leaves) rejects with an AbortError so the caller can clean up.
 */
export async function uploadFile({
  file,
  roomId,
  uploadId,
  chunkSize,
  signal,
  onProgress,
  onStatus,
}: UploadFileArgs): Promise<UploadedFileResponse> {
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

  for (let i = 0; i < totalChunks; i += 1) {
    const from = i * chunkSize;
    const to = Math.min(file.size, from + chunkSize);
    const chunk = file.slice(from, to);

    let attempts = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError');
      try {
        const form = new FormData();
        form.append('uploadId', uploadId);
        form.append('chunkIndex', String(i));
        form.append('chunk', chunk, file.name);
        await api.post('/upload/chunk', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 0,
          signal,
        });
        onStatus?.('uploading');
        break;
      } catch (err) {
        if (signal?.aborted) throw err;
        // Network dropped → pause and wait (resume from this same chunk)
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          onStatus?.('waiting-network');
          const back = await waitForOnline(MAX_OFFLINE_WAIT_MS, signal);
          if (!back) throw new Error('Network was down too long — upload paused. Please try again.');
          continue; // retry the same chunk (offline wait doesn't count as an attempt)
        }
        attempts += 1;
        if (attempts >= 4) throw err;
        await new Promise((r) => setTimeout(r, 800 * attempts));
      }
    }
    if (onProgress) onProgress(((i + 1) / totalChunks) * 100);
  }

  const finalize = await api.post<UploadedFileResponse>(
    '/upload/finalize',
    {
      uploadId,
      roomId,
      fileName: file.name,
      totalChunks,
      mimeType: file.type || 'application/octet-stream',
    },
    { timeout: 0, signal },
  );
  return finalize.data;
}

/** Tell the server to discard a partial/interrupted upload's temp chunks. */
export async function abortUpload(uploadId: string): Promise<void> {
  try {
    await api.post('/upload/abort', { uploadId }, { timeout: 8000 });
  } catch {
    /* best-effort cleanup */
  }
}
