import { toast as sonnerToast, ExternalToast } from 'sonner';
import React from 'react';

const withCopyAction = (message: string | React.ReactNode, options?: ExternalToast) => {
  // Respect a caller-provided action (e.g. "Undo") — never clobber it with Copy.
  if (options?.action) return options;
  const msgStr = typeof message === 'string' ? message : 'Content copied';
  return {
    ...options,
    action: {
      label: 'Copy',
      onClick: () => {
        navigator.clipboard.writeText(msgStr);
        sonnerToast.success('Copied to clipboard');
      }
    },
    cancel: {
      label: 'Close',
      onClick: () => {} // Sonner dismisses on cancel click
    }
  };
};

export const toast = {
  success: (message: string | React.ReactNode, data?: ExternalToast) => 
    sonnerToast.success(message, withCopyAction(message, data)),
  error: (message: string | React.ReactNode, data?: ExternalToast) => 
    sonnerToast.error(message, withCopyAction(message, data)),
  info: (message: string | React.ReactNode, data?: ExternalToast) => 
    sonnerToast.info(message, withCopyAction(message, data)),
  warning: (message: string | React.ReactNode, data?: ExternalToast) => 
    sonnerToast.warning(message, withCopyAction(message, data)),
  message: (message: string | React.ReactNode, data?: ExternalToast) => 
    sonnerToast(message, withCopyAction(message, data)),
  custom: sonnerToast.custom,
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise,
};
