'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { useMyBatches } from '../_lib/hooks';
import type { Batch } from '../_lib/types';

export default function MyBatchesPage() {
  const { data: batches, isLoading } = useMyBatches();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const list: Batch[] = Array.isArray(batches) ? batches : (batches as any)?.content ?? [];

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-zinc-900 mb-6">My Batches</h1>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
          <GraduationCap size={36} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500">You haven't been enrolled in any batches yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((batch: Batch) => (
            <Link key={batch.id} href={`/education/my/batches/${batch.id}`}>
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer">
                <h3 className="text-zinc-900 font-semibold">{batch.name}</h3>
                {batch.academicYear && (
                  <p className="text-zinc-500 text-sm mt-0.5">{batch.academicYear}</p>
                )}
                <p className="text-zinc-500 text-sm mt-3">
                  <span className="font-semibold text-zinc-700">{batch.subjectCount}</span> subject
                  {batch.subjectCount !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
