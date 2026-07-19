import type { Metadata } from 'next';
import { JoinShell } from '@/components/dashboard/join-shell';

export const metadata: Metadata = {
  title: 'Join room',
  robots: { index: false, follow: false },
};

export default function JoinByCodePage({ params }: { params: { code: string } }) {
  return <JoinShell code={params.code} />;
}
