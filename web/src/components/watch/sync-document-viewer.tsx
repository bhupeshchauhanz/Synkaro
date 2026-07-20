'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Loader2 } from 'lucide-react';
import { getSocket, type WatchStateDto } from '@/lib/socket';

interface Props {
  src: string;
  fileName: string;
  roomId: string;
  state: WatchStateDto | null;
}

/**
 * A synced document viewer for PDF files in the watch-together stage.
 * Uses the browser's built-in PDF rendering via <iframe> or <embed>.
 * Page navigation is synced across room members via the existing watch:seek socket event.
 *
 * For PPT files, we show a download prompt since browsers can't render them natively.
 */
export function SyncDocumentViewer({ src, fileName, roomId, state }: Props) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const lastApplied = useRef<number>(0);
  const isPdf = /\.pdf$/i.test(fileName) || src.includes('.pdf');
  const isPpt = /\.(ppt|pptx)$/i.test(fileName);

  // Apply remote page sync from watch state
  useEffect(() => {
    if (!state) return;
    const remotePage = Math.max(1, Math.round(state.timestamp));
    if (remotePage !== lastApplied.current && remotePage !== page) {
      lastApplied.current = remotePage;
      setPage(remotePage);
    }
  }, [state, page]);

  const goToPage = useCallback((p: number) => {
    const newPage = Math.max(1, p);
    setPage(newPage);
    lastApplied.current = newPage;
    // Use the existing seek event — timestamp = page number for documents
    getSocket().emit('watch:seek', { roomId, timestamp: newPage });
  }, [roomId]);

  const zoomIn = () => setZoom((z) => Math.min(200, z + 25));
  const zoomOut = () => setZoom((z) => Math.max(50, z - 25));

  // For PPT files — show download card since browsers can't render them
  if (isPpt) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black/90 p-8">
        <div className="card max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20">
            <span className="text-3xl">📊</span>
          </div>
          <h3 className="font-display text-lg font-semibold">PowerPoint Presentation</h3>
          <p className="mt-2 text-sm text-text-secondary">{fileName}</p>
          <p className="mt-3 text-xs text-text-tertiary leading-relaxed">
            PowerPoint files can&apos;t be rendered directly in the browser.
            Download it to view in your presentation app.
          </p>
          <a
            href={src}
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-5 inline-flex items-center gap-2 text-sm"
          >
            <Download className="h-4 w-4" /> Download presentation
          </a>
        </div>
      </div>
    );
  }

  // PDF viewer — uses iframe embed with page navigation
  return (
    <div className="relative flex h-full w-full flex-col bg-black/95">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-medium truncate max-w-[200px]">{fileName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="rounded-full p-1.5 hover:bg-white/10 transition-colors disabled:opacity-30" aria-label="Previous page">
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <span className="text-xs text-white/70 min-w-[40px] text-center">Page {page}</span>
          <button onClick={() => goToPage(page + 1)} className="rounded-full p-1.5 hover:bg-white/10 transition-colors" aria-label="Next page">
            <ChevronRight className="h-4 w-4 text-white" />
          </button>
          <div className="mx-2 h-4 w-px bg-white/10" />
          <button onClick={zoomOut} disabled={zoom <= 50} className="rounded-full p-1.5 hover:bg-white/10 transition-colors disabled:opacity-30" aria-label="Zoom out">
            <ZoomOut className="h-4 w-4 text-white" />
          </button>
          <span className="text-[10px] text-white/60 w-8 text-center">{zoom}%</span>
          <button onClick={zoomIn} disabled={zoom >= 200} className="rounded-full p-1.5 hover:bg-white/10 transition-colors disabled:opacity-30" aria-label="Zoom in">
            <ZoomIn className="h-4 w-4 text-white" />
          </button>
          <div className="mx-2 h-4 w-px bg-white/10" />
          <a href={src} download={fileName} target="_blank" rel="noopener noreferrer" className="rounded-full p-1.5 hover:bg-white/10 transition-colors" aria-label="Download" title="Download PDF">
            <Download className="h-4 w-4 text-white" />
          </a>
        </div>
      </div>

      {/* PDF embed */}
      <div className="relative flex-1 overflow-auto">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        <iframe
          src={`${src}#page=${page}`}
          title={fileName}
          className="h-full w-full border-0"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
