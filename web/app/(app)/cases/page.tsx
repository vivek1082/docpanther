'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Filter, ChevronRight, FileText, Trash2 } from 'lucide-react';
import api from '@/lib/api';

interface Case {
  id: string;
  referenceNo: string;
  customerName: string;
  customerEmail: string;
  status: 'PENDING' | 'PARTIAL' | 'COMPLETE';
  totalItems: number;
  uploadedItems: number;
  createdAt: string;
  expiresAt: string | null;
  tags: string[];
}

interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const STATUS_BADGE: Record<Case['status'], string> = {
  PENDING: 'bg-zinc-100 text-zinc-600',
  PARTIAL: 'bg-orange-50 text-orange-600 border border-orange-200',
  COMPLETE: 'bg-green-100 text-green-700',
};

function StatusBadge({ status }: { status: Case['status'] }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}>
      {label}
    </span>
  );
}

function ProgressBar({ uploaded, total }: { uploaded: number; total: number }) {
  const pct = total > 0 ? Math.round((uploaded / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-zinc-100 h-1.5 rounded-full min-w-[80px]">
        <div
          className="bg-orange-500 h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400 shrink-0 tabular-nums">
        {uploaded}/{total}
      </span>
    </div>
  );
}

type StatusFilter = '' | Case['status'];

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params: Record<string, string | number> = { size: 100, page: 0 };
    if (statusFilter) params.status = statusFilter;
    api
      .get<PageResponse<Case>>('/api/cases', { params })
      .then((r) => setCases(r.data.content))
      .catch(() => setError('Failed to load cases. Please try again.'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.referenceNo.toLowerCase().includes(q) ||
        c.customerEmail.toLowerCase().includes(q),
    );
  }, [cases, search]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this case? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/cases/${id}`);
      setCases((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('Failed to delete case. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  const filterLabels: { value: StatusFilter; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PARTIAL', label: 'Partial' },
    { value: 'COMPLETE', label: 'Complete' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900">Cases</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              Manage document collection requests
            </p>
          </div>
          <Link
            href="/cases/new"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            New Case
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or reference…"
              className="w-full border border-zinc-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={14} className="text-zinc-400 shrink-0" />
            {filterLabels.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === value
                    ? 'bg-orange-500 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20 text-zinc-400 text-sm">Loading…</div>
        ) : error ? (
          <div className="text-center py-20 text-red-600 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={40} className="mx-auto text-zinc-200 mb-3" />
            <p className="text-zinc-500 font-semibold">No cases found</p>
            <p className="text-zinc-400 text-sm mt-1">
              {search
                ? 'Try a different search term'
                : 'Create your first case to get started'}
            </p>
            {!search && (
              <Link
                href="/cases/new"
                className="inline-flex items-center gap-2 mt-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
              >
                <Plus size={15} />
                New Case
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Reference
                  </th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Progress
                  </th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Created
                  </th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/cases/${c.id}`)}
                    className="hover:bg-zinc-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4 font-mono text-sm text-zinc-900 font-medium">
                      {c.referenceNo}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-zinc-900">
                        {c.customerName}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {c.customerEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-6 py-4 min-w-[160px]">
                      <ProgressBar
                        uploaded={c.uploadedItems}
                        total={c.totalItems}
                      />
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={(e) => handleDelete(e, c.id)}
                          disabled={deletingId === c.id}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40"
                          title="Delete case"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight
                          size={15}
                          className="text-zinc-200 group-hover:text-zinc-400 transition-colors"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-3 border-t border-zinc-50 text-xs text-zinc-400">
              {filtered.length} case{filtered.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
