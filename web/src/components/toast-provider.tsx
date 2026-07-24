'use client';

import { Toaster } from 'sonner';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        theme="dark"
        duration={4000}
        closeButton={false}
        gap={10}
        offset={70}
        visibleToasts={3}
        icons={{
          success: <CheckCircle2 className="h-5 w-5 text-emerald-500" fill="currentColor" />,
          error: <AlertCircle className="h-5 w-5 text-red-500" fill="currentColor" />,
          warning: <AlertTriangle className="h-5 w-5 text-amber-500" fill="currentColor" />,
          info: <Info className="h-5 w-5 text-blue-500" fill="currentColor" />,
          loading: <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />,
        }}
        toastOptions={{
          classNames: {
            toast: [
              '!bg-[#1c1c1e]',
              '!border !border-white/10',
              '!rounded-xl',
              '!shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
              '!px-5 !py-3.5',
              '!min-h-[48px]',
              '!items-center',
            ].join(' '),
            title: '!text-[14px] !font-medium !text-white !leading-snug',
            description: '!text-[13px] !text-gray-400 !mt-0.5',
            success: '',
            error: '',
            warning: '',
            info: '',
            cancelButton: '!bg-white/10 !text-white !font-medium !text-[12px] !px-3 !py-1.5 !rounded-lg hover:!bg-white/20 !ml-2',
            actionButton: '!bg-white/10 !text-white !font-medium !text-[12px] !px-3 !py-1.5 !rounded-lg hover:!bg-white/20',
          },
          style: {
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        }}
      />
    </>
  );
}
