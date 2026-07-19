'use client';

import { useEffect, useState } from 'react';
import { Search, Trash2, Loader2, Users, Download, X } from 'lucide-react';
import { api, getApiError } from '@/lib/api';
import { toast } from '@/lib/toast';

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  emailVerified: boolean;
  createdAt: string;
  lastSeenAt: string;
  roomCount: number;
  messageCount: number;
}

interface UserDetail extends User {
  bio: string | null;
  phone: string | null;
  fileCount: number;
  rooms: { id: string; name: string; type: string; inviteCode: string; role: string }[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/users/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'synkaro-users.csv';
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
      const res = await api.get<UserDetail>(`/admin/users/${id}`);
      setDetail(res.data);
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchUsers = async (p: number, q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (q) params.set('search', q);
      const res = await api.get<{ users: User[]; total: number }>(`/admin/users?${params}`);
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch (err) {
      toast.error(getApiError(err).error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page, search);
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers(1, search);
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    setDeleting(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success(`User "${username}" deleted`);
      fetchUsers(page, search);
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
          <Users className="h-6 w-6 text-text-secondary" />
          <h1 className="font-display text-2xl font-bold tracking-tight">Users ({total})</h1>
        </div>
        <button onClick={exportCsv} disabled={exporting} className="btn-ghost text-xs">
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export CSV
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by username or email..."
            className="input pl-10"
          />
        </div>
        <button onClick={handleSearch} className="btn-ghost text-xs">Search</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary">User</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary">Rooms</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary">Messages</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary">Joined</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-text-tertiary">Status</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-tertiary">No users found.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => openDetail(u.id)}
                    className="border-b border-border hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated text-xs font-semibold overflow-hidden">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            u.username[0]?.toUpperCase()
                          )}
                        </div>
                        <span className="font-medium">{u.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{u.email}</td>
                    <td className="py-3 px-4 font-mono">{u.roomCount}</td>
                    <td className="py-3 px-4 font-mono">{u.messageCount}</td>
                    <td className="py-3 px-4 text-text-tertiary text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs ${u.emailVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${u.emailVerified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {u.emailVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(u.id, u.username); }}
                        disabled={deleting === u.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Delete user"
                      >
                        {deleting === u.id ? (
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

      {/* User detail modal */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => { setDetail(null); setDetailLoading(false); }}
        >
          <div
            className="card w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-text-tertiary" /></div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated text-lg font-semibold overflow-hidden">
                      {detail.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={detail.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        detail.username[0]?.toUpperCase()
                      )}
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold tracking-tight">{detail.username}</h2>
                      <p className="text-xs text-text-tertiary">{detail.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setDetail(null)} className="text-text-tertiary hover:text-text-primary">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white/[0.04] p-3"><p className="text-lg font-bold">{detail.roomCount}</p><p className="text-[10px] text-text-tertiary">Rooms</p></div>
                  <div className="rounded-lg bg-white/[0.04] p-3"><p className="text-lg font-bold">{detail.messageCount}</p><p className="text-[10px] text-text-tertiary">Messages</p></div>
                  <div className="rounded-lg bg-white/[0.04] p-3"><p className="text-lg font-bold">{detail.fileCount}</p><p className="text-[10px] text-text-tertiary">Files</p></div>
                </div>

                <dl className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-text-tertiary">Bio</dt><dd className="text-right">{detail.bio || '—'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-text-tertiary">Phone</dt><dd className="text-right">{detail.phone || '—'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-text-tertiary">Email verified</dt><dd className="text-right">{detail.emailVerified ? 'Yes' : 'No'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-text-tertiary">Joined</dt><dd className="text-right">{new Date(detail.createdAt).toLocaleString()}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-text-tertiary">Last seen</dt><dd className="text-right">{new Date(detail.lastSeenAt).toLocaleString()}</dd></div>
                </dl>

                {detail.rooms.length > 0 ? (
                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-wider text-text-tertiary mb-2">Rooms</p>
                    <div className="space-y-1.5">
                      {detail.rooms.map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                          <span className="truncate">{r.name} <span className="text-text-tertiary">({r.type})</span></span>
                          <span className="text-[11px] text-text-tertiary">{r.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
