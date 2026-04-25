'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useBatches, useRole } from '../_lib/hooks';
import type { Batch } from '../_lib/types';
import { BatchCard } from '../_components/BatchCard';

export default function BatchListPage() {
  const role = useRole();
  const { data, isLoading } = useBatches();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const batches = data?.content ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-zinc-900">Batches</h1>
        {role === 'TENANT_ADMIN' && (
          <Link
            href="/education/batches/new"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={16} />
            New Batch
          </Link>
        )}
      </div>

      {batches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
          <p className="text-zinc-500 mb-4">No batches yet.</p>
          {role === 'TENANT_ADMIN' && (
            <Link
              href="/education/batches/new"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={16} />
              Create first batch
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch: Batch) => (
            <BatchCard key={batch.id} batch={batch} href={`/education/batches/${batch.id}`} />
          ))}
        </div>
      )}

      {(data?.totalPages ?? 0) > 1 && (
        <p className="text-center text-zinc-500 text-sm mt-6">
          Page {(data?.page ?? 0) + 1} of {data?.totalPages}
        </p>
      )}
    </div>
  );
}
