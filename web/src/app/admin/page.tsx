'use client';

import { useEffect, useState } from 'react';
import { Users, HardDrive, Video, Activity, Heart } from 'lucide-react';
import { api, getApiError } from '@/lib/api';
import { TrendChart } from '@/components/admin/trend-chart';

interface Series {
  date: string;
  count: number;
}

interface DashboardData {
  totalUsers: number;
  usersToday: number;
  activeUsers: number;
  totalRooms: number;
  totalMessages: number;
  totalFiles: number;
  storageUsedMB: number;
  roomTypeSplit?: { couple: number; friend: number };
  signupsPerDay: Series[];
  messagesPerDay?: Series[];
  roomsPerDay?: Series[];
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.08]">
          <Icon className="h-5 w-5 text-text-secondary" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-text-tertiary">{label}</p>
        </div>
      </div>
      {sub ? <p className="mt-2 text-[11px] text-text-muted">{sub}</p> : null}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardData>('/admin/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(getApiError(err).error));
  }, []);

  if (error) {
    return (
      <div className="card text-center py-12">
        <p className="text-danger text-sm">{error}</p>
        <p className="mt-2 text-xs text-text-tertiary">You may not have admin access.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={data.totalUsers} sub={`${data.usersToday} joined today`} />
        <StatCard icon={Activity} label="Active Now" value={data.activeUsers} sub="Last 15 minutes" />
        <StatCard icon={Video} label="Total Rooms" value={data.totalRooms} />
        <StatCard icon={HardDrive} label="Storage Used" value={`${data.storageUsedMB} MB`} sub={`${data.totalFiles} files`} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TrendChart data={data.signupsPerDay} label="Signups (7d)" color="#8b5cf6" />
        <TrendChart data={data.messagesPerDay ?? []} label="Messages (7d)" color="#22c55e" />
        <TrendChart data={data.roomsPerDay ?? []} label="Rooms created (7d)" color="#3b82f6" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card">
          <h3 className="font-display text-lg font-semibold tracking-tight mb-4">Room Types</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-text-secondary">
                <Heart className="h-4 w-4 text-pink-400" /> Couple rooms
              </span>
              <span className="font-mono text-sm">{data.roomTypeSplit?.couple ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-text-secondary">
                <Users className="h-4 w-4 text-blue-400" /> Friend rooms
              </span>
              <span className="font-mono text-sm">{data.roomTypeSplit?.friend ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display text-lg font-semibold tracking-tight mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Total Messages</span>
              <span className="font-mono text-sm">{data.totalMessages.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Total Files</span>
              <span className="font-mono text-sm">{data.totalFiles}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Avg Messages/User</span>
              <span className="font-mono text-sm">
                {data.totalUsers > 0 ? Math.round(data.totalMessages / data.totalUsers) : 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
