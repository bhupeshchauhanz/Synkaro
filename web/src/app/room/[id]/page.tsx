import type { Metadata } from 'next';
import { RoomShell } from '@/components/room/room-shell';

export const metadata: Metadata = {
  title: 'Room',
  robots: { index: false, follow: false },
};

interface Params {
  params: { id: string };
}

export default function RoomPage({ params }: Params) {
  return <RoomShell roomId={params.id} />;
}
