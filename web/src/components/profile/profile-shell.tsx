'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, Save, Camera, Mail, Phone, MapPin, Calendar, ArrowLeft } from 'lucide-react';
import { toast } from '@/lib/toast';
import { api, getApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { AppHeader } from '@/components/app-header';

export function ProfileShell() {
  const router = useRouter();
  const { user, status, load, refreshUser } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [avatar, setAvatar] = useState('');

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);
  useEffect(() => {
    if (status === 'guest') router.replace('/auth/login?next=/profile');
  }, [status, router]);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username);
    setBio(user.bio ?? '');
    setPhone(user.phone ?? '');
    setAddress(user.address ?? '');
    setDob(user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '');
    setAvatar(user.avatar ?? '');
  }, [user]);

  if (status !== 'authenticated' || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
      </main>
    );
  }

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(f);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/users/me', {
        username,
        bio: bio || undefined,
        phone: phone || undefined,
        address: address || undefined,
        dateOfBirth: dob || undefined,
        avatar: avatar || undefined,
      });
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen">
      <AppHeader />

      <div className="mx-auto max-w-4xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <p className="text-sm text-text-tertiary">Profile</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tightest md:text-5xl">
            <span className="gradient-text">@{user.username}</span>
          </h1>
        </motion.div>

        {/* Stats row */}
        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="card">
            <p className="text-xs uppercase tracking-wider text-text-tertiary">Account</p>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight gradient-text">Free</p>
            <p className="mt-1 text-[11px] text-text-tertiary">
              All features included
            </p>
          </div>
          <div className="card">
            <p className="text-xs uppercase tracking-wider text-text-tertiary">Email</p>
            <p className="mt-2 truncate text-sm font-medium">{user.email}</p>
            <p className="mt-1 text-[11px]">
              {user.emailVerified ? (
                <span className="badge-success !text-[10px] !py-0.5 !px-2">Verified</span>
              ) : (
                <span className="badge !text-[10px] !py-0.5 !px-2">Unverified</span>
              )}
            </p>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={onSave} className="card mt-6">
          <h2 className="font-display text-xl font-bold tracking-tight">Personal info</h2>
          <p className="mt-1 text-xs text-text-tertiary">
            Update your profile details. Visible to people in your rooms.
          </p>

          {/* Avatar */}
          <div className="mt-6 flex items-center gap-5">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt="avatar"
                className="h-20 w-20 rounded-full border border-border-strong object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-black text-2xl font-bold">
                {username[0]?.toUpperCase()}
              </div>
            )}
            <label className="btn-ghost text-xs cursor-pointer">
              <Camera className="h-3.5 w-3.5" /> Change avatar
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onAvatarFile}
                className="hidden"
              />
            </label>
            {avatar ? (
              <button
                type="button"
                onClick={() => setAvatar('')}
                className="text-xs text-text-tertiary hover:text-text-primary"
              >
                Remove
              </button>
            ) : null}
          </div>

          <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={20}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Bio
              </label>
              <input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                placeholder="Movies, music, & long-distance vibes."
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                <Phone className="inline h-3 w-3 mr-1" /> Phone (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 7500..."
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                <MapPin className="inline h-3 w-3 mr-1" /> Address (optional)
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="City, Country"
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                <Calendar className="inline h-3 w-3 mr-1" /> Date of birth (optional)
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                <Mail className="inline h-3 w-3 mr-1" /> Email
              </label>
              <input value={user.email} disabled className="input opacity-60" />
            </div>
          </div>

          <div className="mt-7 flex items-center justify-end gap-3">
            <Link href="/dashboard" className="btn-ghost text-xs">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="btn-primary text-xs">
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" /> Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
