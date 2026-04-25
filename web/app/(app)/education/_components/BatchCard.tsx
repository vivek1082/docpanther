import Link from 'next/link';
import type { Batch } from '../_lib/types';

interface BatchCardProps {
  batch: Batch;
  href: string;
}

export function BatchCard({ batch, href }: BatchCardProps) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-zinc-900 font-semibold text-base truncate">{batch.name}</h3>
            {batch.academicYear && (
              <p className="text-zinc-500 text-sm mt-0.5">{batch.academicYear}</p>
            )}
          </div>
          <span className="bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full shrink-0">
            Active
          </span>
        </div>
        <div className="flex gap-4 mt-4 text-sm text-zinc-500">
          <span>
            <span className="font-semibold text-zinc-700">{batch.subjectCount}</span> subjects
          </span>
          <span>
            <span className="font-semibold text-zinc-700">{batch.enrollmentCount}</span> students
          </span>
        </div>
      </div>
    </Link>
  );
}
