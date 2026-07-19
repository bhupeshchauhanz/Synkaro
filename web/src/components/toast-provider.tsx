'use client';

import { Toaster } from 'sonner';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        theme="light"
        duration={5000}
        closeButton={false}
        gap={10}
        offset={20}
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
              '!bg-white',
              '!border !border-gray-200',
              '!rounded-xl',
              '!shadow-[0_4px_24px_rgba(0,0,0,0.08)]',
              '!px-5 !py-3.5',
              '!min-h-[48px]',
              '!items-center',
            ].join(' '),
            title: '!text-[14px] !font-medium !text-gray-800 !leading-snug',
            description: '!text-[13px] !text-gray-500 !mt-0.5',
            success: '',
            error: '',
            warning: '',
            info: '',
            cancelButton: '!bg-gray-100 !text-gray-600 !font-medium !text-[12px] !px-3 !py-1.5 !rounded-lg hover:!bg-gray-200 !ml-2',
            actionButton: '!bg-black !text-white !font-medium !text-[12px] !px-3 !py-1.5 !rounded-lg hover:!bg-gray-800',
          },
          style: {
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        }}
      />
    </>
  );
}
