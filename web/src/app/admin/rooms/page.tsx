'use client';

import { useEffect, useState } from 'react';
import { Trash2, Loader2, Users, Heart, Video, MessageSquare } from 'lucide-react';
import { api, getApiError } from '@/lib/api';
import { toast } from '@/lib/toast';

interface Room {
  id: string;
  name: string;
  type: 'couple' | 'friend';
  inviteCode: string;
  memberCount: number;
  members: { id: string; username: string; role: string }[];
  messageCount: number;
  fileCount: number;
  createdAt: string;
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRooms = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get<{ rooms: Room[]; total: number }>(`/admin/rooms?page=${p}&limit=20`);
      setRooms(res.data.rooms);
      setTotal(res.data.total);
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms(page);
  }, [page]);

  const handleDelete = async (roomId: string, roomName: string) => {
    if (!confirm(`Delete room "${roomName}"? This cannot be undone.`)) return;
    setDeleting(roomId);
    try {
      await api.delete(`/admin/rooms/${roomId}`);
      toast.success(`Room "${roomName}" deleted`);
      fetchRooms(page);
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Video className="h-6 w-6 text-text-secondary" />
          <h1 className="font-display text-2xl font-bold tracking-tight">Rooms ({total})</h1>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary">Room</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary">Type</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary">Members</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary">Messages</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary">Files</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary">Created</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-tertiary">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-tertiary">No rooms found.</td>
                </tr>
              ) : (
                rooms.map((r) => (
                  <tr key={r.id} className="border-b border-border hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] border border-white/[0.08]">
                          {r.type === 'couple' ? (
                            <Heart className="h-3.5 w-3.5 text-text-primary" fill="currentColor" />
                          ) : (
                            <Users className="h-3.5 w-3.5 text-text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-[11px] text-text-muted font-mono">{r.inviteCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge text-[10px]">{r.type}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="font-mono">{r.memberCount}</span>
                        <span className="text-text-muted text-[10px]">
                          ({r.members.map(m => m.username).join(', ')})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">{r.messageCount}</td>
                    <td className="py-3 px-4 font-mono">{r.fileCount}</td>
                    <td className="py-3 px-4 text-text-tertiary text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDelete(r.id, r.name)}
                        disabled={deleting === r.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Delete room"
                      >
                        {deleting === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 20 ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-xs">
            Previous
          </button>
          <span className="text-xs text-text-tertiary">Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total} className="btn-ghost text-xs">
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
