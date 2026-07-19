import type { Metadata } from 'next';
import { CallShell } from '@/components/call/call-shell';

export const metadata: Metadata = {
  title: 'Call',
  robots: { index: false, follow: false },
};

export default function CallPage({ params }: { params: { id: string } }) {
  return <CallShell roomId={params.id} />;
}
