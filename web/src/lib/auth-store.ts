'use client';

import { create } from 'zustand';
import { api } from './api';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  themePreference: string;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface AuthStore {
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'guest';
  load: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  status: 'idle',
  setUser: (user) => set({ user, status: user ? 'authenticated' : 'guest' }),
  load: async () => {
    set({ status: 'loading' });
    try {
      const res = await api.get<AuthUser>('/auth/me');
      set({ user: res.data, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'guest' });
    }
  },
  refreshUser: async () => {
    if (!get().user) return;
    try {
      const res = await api.get<AuthUser>('/auth/me');
      set({ user: res.data });
    } catch {
      /* ignore */
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      set({ user: null, status: 'guest' });
    }
  },
}));

/** Profile is "complete" when bio, phone and date of birth are set. Avatar is optional. */
export function isProfileComplete(user: AuthUser | null): boolean {
  return !!(user && user.bio?.trim() && user.phone?.trim() && user.dateOfBirth);
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}
