'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Pod {
  id: string;
  region: string;
  type: string;
  status: string;
  tenantCount: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-400',
  MAINTENANCE: 'text-yellow-400',
  DECOMMISSIONED: 'text-red-400',
};

export default function PodsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [region, setRegion] = useState('ap-south-1');
  const [type, setType] = useState('STANDARD');

  const { data: pods = [], isLoading } = useQuery<Pod[]>({
    queryKey: ['admin-pods'],
    queryFn: () => api.get('/api/admin/pods').then(r => r.data),
  });

  const provisionMut = useMutation({
    mutationFn: () => api.post('/api/admin/pods', { region, type }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-pods'] }); setShowNew(false); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/api/admin/pods/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pods'] }),
  });

  if (isLoading) return <div className="text-zinc-500 text-sm">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-zinc-100">Pods ({pods.length})</h1>
        <button
          onClick={() => setShowNew(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          + Provision Pod
        </button>
      </div>

      {showNew && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 mb-6 flex gap-4 items-end">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Region</label>
            <input value={region} onChange={e => setRegion(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 w-40" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100">
              <option>STANDARD</option>
              <option>PREMIUM</option>
            </select>
          </div>
          <button onClick={() => provisionMut.mutate()}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">
            Provision
          </button>
          <button onClick={() => setShowNew(false)} className="text-zinc-500 hover:text-zinc-300 text-sm">Cancel</button>
        </div>
      )}

      <div className="grid gap-4">
        {pods.map((pod) => (
          <div key={pod.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-zinc-500 mb-1">{pod.id}</p>
              <p className="font-semibold text-zinc-100">{pod.region} · {pod.type}</p>
              <p className="text-sm text-zinc-400 mt-0.5">{pod.tenantCount} tenants</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm font-semibold ${STATUS_COLORS[pod.status] ?? 'text-zinc-400'}`}>
                {pod.status}
              </span>
              <select
                defaultValue=""
                onChange={e => e.target.value && statusMut.mutate({ id: pod.id, status: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300"
              >
                <option value="" disabled>Change status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="DECOMMISSIONED">DECOMMISSIONED</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
