import type { Metadata } from 'next';
import { WatchShell } from '@/components/watch/watch-shell';

export const metadata: Metadata = {
  title: 'Watch',
  robots: { index: false, follow: false },
};

export default function WatchPage({ params }: { params: { id: string } }) {
  return <WatchShell roomId={params.id} />;
}
