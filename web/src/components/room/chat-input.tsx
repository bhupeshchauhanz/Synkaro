'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Smile, Image as ImageIcon, X } from 'lucide-react';
import { sendChatMessage } from '@/lib/socket';
import { toast } from '@/lib/toast';

const QUICK_EMOJI = ['😀', '😂', '🥰', '😘', '😎', '🥳', '😭', '😢', '🔥', '❤️', '🫶', '👏', '💯', '✨', '💫', '🎬'];

export function ChatInput({
  onSend,
  onTypingStart,
  onTypingStop,
  roomId,
}: {
  onSend: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  roomId: string;
}) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showEmoji) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showEmoji]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed && !imageFile) return;

    if (imageFile) {
      setUploading(true);
      try {
        // Convert to base64 and send as image message
        const reader = new FileReader();
        reader.onload = () => {
          sendChatMessage(
            {
              roomId,
              content: trimmed || undefined,
              type: 'image',
              fileUrl: reader.result as string,
            },
            (e) => toast.error(e),
          );
        };
        reader.readAsDataURL(imageFile);
        removeImage();
      } catch {
        toast.error('Failed to send image');
      } finally {
        setUploading(false);
      }
    }

    if (trimmed) {
      onSend(trimmed);
    }
    setText('');
    onTypingStop();
    inputRef.current?.focus();
  };

  return (
    <div className="shrink-0 border-t border-white/[0.06] bg-black/60 backdrop-blur-xl px-3 py-2 md:px-6 md:py-3">
      {/* Image preview */}
      {imagePreview ? (
        <div className="mx-auto max-w-3xl mb-2 relative inline-block">
          <img src={imagePreview} alt="preview" className="h-20 md:h-24 rounded-xl border border-border object-cover" />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center rounded-full bg-danger text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-3xl items-center gap-1.5 md:gap-2 relative">
        {showEmoji ? (
          <div
            ref={pickerRef}
            className="absolute bottom-full left-0 right-0 mb-2 grid grid-cols-8 gap-0.5 rounded-xl border border-border bg-bg-elevated/95 backdrop-blur-xl p-2 shadow-2xl max-w-[calc(100vw-24px)]"
          >
            {QUICK_EMOJI.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setText((t) => t + e);
                  setShowEmoji(false);
                  inputRef.current?.focus();
                }}
                className="h-9 w-9 rounded-lg text-lg transition-all hover:bg-white/[0.08] hover:scale-110 active:scale-95"
              >
                {e}
              </button>
            ))}
          </div>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl text-text-tertiary hover:text-text-primary hover:bg-white/[0.06] transition-colors"
          aria-label="Send image"
        >
          <ImageIcon className="h-[18px] w-[18px] md:h-5 md:w-5" />
        </button>
        <button
          type="button"
          onClick={() => setShowEmoji((s) => !s)}
          className={`flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
            showEmoji
              ? 'bg-white/[0.08] text-text-primary'
              : 'text-text-tertiary hover:text-text-primary hover:bg-white/[0.06]'
          }`}
          aria-label="Insert emoji"
        >
          <Smile className="h-[18px] w-[18px] md:h-5 md:w-5" />
        </button>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value) onTypingStart();
            else onTypingStop();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          onBlur={onTypingStop}
          placeholder="Send a message"
          className="input flex-1 !py-2 md:!py-2.5 !rounded-xl !text-sm min-w-0"
        />
        <button
          onClick={submit}
          disabled={(!text.trim() && !imageFile) || uploading}
          className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black transition-all
            hover:scale-[1.02] active:scale-[0.98]
            disabled:bg-white/10 disabled:text-text-tertiary disabled:scale-100 disabled:cursor-not-allowed"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
