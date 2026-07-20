'use client';

import { useEffect, useState } from 'react';
import { Trash2, Loader2, Users, Heart, Video, Download, X } from 'lucide-react';
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

interface RoomDetail {
  id: string;
  name: string;
  nickname: string | null;
  type: string;
  inviteCode: string;
  createdAt: string;
  messageCount: number;
  members: { id: string; username: string; email: string; role: string }[];
  files: { id: string; fileName: string; fileSizeMB: number }[];
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState<RoomDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/rooms/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'synkaro-rooms.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setExporting(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.get<RoomDetail>(`/admin/rooms/${id}`);
      setDetail(res.data);
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setDetailLoading(false);
    }
  };

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
        <button onClick={exportCsv} disabled={exporting} className="btn-ghost text-xs">
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export CSV
        </button>
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
                  <tr key={r.id} onClick={() => openDetail(r.id)} className="border-b border-border hover:bg-white/[0.02] transition-colors cursor-pointer">
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
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id, r.name); }}
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

      {/* Room detail modal */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => { setDetail(null); setDetailLoading(false); }}
        >
          <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-text-tertiary" /></div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/[0.06] border border-white/[0.08]">
                      {detail.type === 'couple' ? <Heart className="h-4 w-4" fill="currentColor" /> : <Users className="h-4 w-4" />}
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold tracking-tight">{detail.nickname || detail.name}</h2>
                      <p className="text-[11px] text-text-tertiary font-mono">Code: {detail.inviteCode} · {detail.type}</p>
                    </div>
                  </div>
                  <button onClick={() => setDetail(null)} className="text-text-tertiary hover:text-text-primary"><X className="h-5 w-5" /></button>
                </div>

                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-text-tertiary">Room ID</dt><dd className="font-mono text-[11px] text-right break-all">{detail.id}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-text-tertiary">Messages</dt><dd>{detail.messageCount}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-text-tertiary">Files</dt><dd>{detail.files.length}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-text-tertiary">Created</dt><dd>{new Date(detail.createdAt).toLocaleString()}</dd></div>
                </dl>

                <p className="mt-5 mb-2 text-xs uppercase tracking-wider text-text-tertiary">Members ({detail.members.length})</p>
                <div className="space-y-1.5">
                  {detail.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.username}</p>
                        <p className="truncate text-[11px] text-text-tertiary">{m.email}</p>
                      </div>
                      <span className="text-[11px] text-text-tertiary shrink-0">{m.role}</span>
                    </div>
                  ))}
                </div>

                {detail.files.length > 0 ? (
                  <>
                    <p className="mt-5 mb-2 text-xs uppercase tracking-wider text-text-tertiary">Files</p>
                    <div className="space-y-1.5">
                      {detail.files.map((f) => (
                        <div key={f.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                          <span className="truncate">{f.fileName}</span>
                          <span className="text-[11px] text-text-tertiary shrink-0">{f.fileSizeMB} MB</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
