'use client';

import { useState } from 'react';
import api from '@/lib/api';

interface UserLookup {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  tenantId: string | null;
}

export default function UserLookupPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<UserLookup | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get(`/api/admin/users?email=${encodeURIComponent(email.trim())}`);
      setResult(res.data);
    } catch {
      setError('User not found');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold text-zinc-100 mb-6">User Lookup</h1>

      <div className="flex gap-3 mb-6">
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="user@example.com"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          onClick={search}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 text-white font-semibold px-5 py-3 rounded-xl"
        >
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {result && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            {result.avatarUrl ? (
              <img src={result.avatarUrl} className="w-12 h-12 rounded-full" alt="" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-lg">
                {result.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div>
              <p className="font-semibold text-zinc-100">{result.name || '—'}</p>
              <p className="text-sm text-zinc-400">{result.email}</p>
            </div>
            <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${result.emailVerified ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {result.emailVerified ? 'Verified' : 'Unverified'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">User ID</p>
              <p className="font-mono text-zinc-300 text-xs break-all">{result.id}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Tenant ID</p>
              <p className="font-mono text-zinc-300 text-xs break-all">{result.tenantId ?? '—'}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Registered</p>
              <p className="text-zinc-300 text-xs">{new Date(result.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
