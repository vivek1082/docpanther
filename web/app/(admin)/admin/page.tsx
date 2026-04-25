'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Stats {
  totalTenants: number;
  totalIndividuals: number;
  totalCases: number;
  totalStorageGb: number;
  activePodsCount: number;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <p className="text-sm text-zinc-500 mb-1">{label}</p>
      <p className="text-3xl font-extrabold text-zinc-100">{value}</p>
    </div>
  );
}

export default function AdminStatsPage() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/api/admin/stats').then(r => r.data),
  });

  if (isLoading) return <div className="text-zinc-500 text-sm">Loading…</div>;
  if (!stats) return <div className="text-red-400 text-sm">Failed to load stats</div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-zinc-100 mb-6">Platform Stats</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Organisations" value={stats.totalTenants} />
        <StatCard label="Individual Users" value={stats.totalIndividuals} />
        <StatCard label="Total Cases" value={stats.totalCases} />
        <StatCard label="Storage Used" value={`${stats.totalStorageGb.toFixed(2)} GB`} />
        <StatCard label="Active Pods" value={stats.activePodsCount} />
      </div>
    </div>
  );
}
