'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { useMyBatch } from '../../../_lib/hooks';
import type { BatchSubject, Material } from '../../../_lib/types';

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

interface ApprovedMaterial extends Material {
  status: 'APPROVED';
}

function SubjectMaterials({
  subject,
  materials,
}: {
  subject: BatchSubject;
  materials: ApprovedMaterial[];
}) {
  if (materials.length === 0) return null;

  return (
    <div className="border border-zinc-100 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100">
        <h3 className="font-semibold text-zinc-900 text-sm">{subject.name}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          {materials.length} material{materials.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="divide-y divide-zinc-100">
        {materials.map(m => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                <FileText size={14} className="text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{m.title}</p>
                <p className="text-xs text-zinc-400">
                  {m.filename} · {formatBytes(m.sizeBytes)}
                </p>
              </div>
            </div>
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full shrink-0 ml-3">
              Available
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: batch, isLoading } = useMyBatch(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!batch) return <p className="text-red-600">Batch not found.</p>;

  const subjects: BatchSubject[] = batch.subjects ?? [];

  return (
    <div>
      <Link
        href="/education/my"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        My Batches
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-zinc-900">{batch.name}</h1>
        {batch.academicYear && (
          <p className="text-zinc-500 text-sm mt-0.5">{batch.academicYear}</p>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
          <p className="text-zinc-500">No materials available yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subjects.map(subject => {
            const approved = (subject as any).materials?.filter(
              (m: Material) => m.status === 'APPROVED',
            ) as ApprovedMaterial[];
            return (
              <SubjectMaterials
                key={subject.id}
                subject={subject}
                materials={approved ?? []}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
