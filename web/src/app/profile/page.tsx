import type { Metadata } from 'next';
import { ProfileShell } from '@/components/profile/profile-shell';

export const metadata: Metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileShell />;
}
