'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  region: string;
  storageGb: number;
  casesTotal: number;
  createdAt: string;
  podId: string | null;
  podRegion: string | null;
}

const PLANS = ['FREE', 'PRO', 'ENTERPRISE'];

export default function TenantsPage() {
  const qc = useQueryClient();
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [planId, setPlanId] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState('');

  const { data, isLoading } = useQuery<{ content: Tenant[] }>({
    queryKey: ['admin-tenants'],
    queryFn: () => api.get('/api/admin/tenants').then(r => r.data),
  });

  const suspendMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/api/admin/tenants/${id}/suspend`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); setSuspendId(null); setSuspendReason(''); },
  });

  const reactivateMut = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/tenants/${id}/reactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenants'] }),
  });

  const planMut = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) =>
      api.put(`/api/admin/tenants/${id}/plan`, { plan }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); setPlanId(null); },
  });

  const tenants = data?.content ?? [];

  if (isLoading) return <div className="text-zinc-500 text-sm">Loading…</div>;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-zinc-100 mb-6">Tenants ({tenants.length})</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-500">
              <th className="pb-3 pr-4 font-medium">Organisation</th>
              <th className="pb-3 pr-4 font-medium">Plan</th>
              <th className="pb-3 pr-4 font-medium">Region</th>
              <th className="pb-3 pr-4 font-medium">Cases</th>
              <th className="pb-3 pr-4 font-medium">Storage</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-900/50">
                <td className="py-3 pr-4">
                  <p className="font-medium text-zinc-100">{t.name}</p>
                  <p className="text-zinc-500 text-xs">{t.slug}</p>
                </td>
                <td className="py-3 pr-4">
                  {planId === t.id ? (
                    <div className="flex gap-2">
                      <select
                        value={newPlan}
                        onChange={e => setNewPlan(e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100"
                      >
                        <option value="">Pick plan</option>
                        {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button
                        onClick={() => newPlan && planMut.mutate({ id: t.id, plan: newPlan })}
                        className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded-lg"
                      >Save</button>
                      <button onClick={() => setPlanId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setPlanId(t.id); setNewPlan(t.plan); }}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded-full"
                    >
                      {t.plan}
                    </button>
                  )}
                </td>
                <td className="py-3 pr-4 text-zinc-400">{t.region || '—'}</td>
                <td className="py-3 pr-4 text-zinc-400">{t.casesTotal}</td>
                <td className="py-3 pr-4 text-zinc-400">{t.storageGb.toFixed(2)} GB</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    {suspendId === t.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          value={suspendReason}
                          onChange={e => setSuspendReason(e.target.value)}
                          placeholder="Reason…"
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 w-32"
                        />
                        <button
                          onClick={() => suspendMut.mutate({ id: t.id, reason: suspendReason })}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg"
                        >Confirm</button>
                        <button onClick={() => setSuspendId(null)} className="text-xs text-zinc-500">✕</button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setSuspendId(t.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >Suspend</button>
                        <button
                          onClick={() => reactivateMut.mutate(t.id)}
                          className="text-xs text-green-400 hover:text-green-300"
                        >Reactivate</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
