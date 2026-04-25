'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Upload, Plus } from 'lucide-react';
import { useMaterials, useRole, useApproveMaterial, useRejectMaterial, useDeleteMaterial } from '../../_lib/hooks';
import type { Material } from '../../_lib/types';
import { MaterialBadge } from '../../_components/MaterialBadge';
import { MaterialUploadModal } from '../../_components/MaterialUploadModal';

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function SubjectDetailPage() {
  const { id: subjectId } = useParams<{ id: string }>();
  const role = useRole();
  const { data, isLoading, refetch } = useMaterials(subjectId);
  const [showUpload, setShowUpload] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const approve = useApproveMaterial();
  const reject = useRejectMaterial();
  const deleteMat = useDeleteMaterial(subjectId);

  const materials = data?.content ?? [];

  return (
    <div>
      <Link
        href="/education/batches"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Batches
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-zinc-900">Subject Materials</h1>
        {(role === 'TENANT_ADMIN' || role === 'TEACHER') && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Upload size={15} />
            Upload Material
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
          <p className="text-zinc-500">No materials uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((m: Material) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/education/materials/${m.id}`}
                    className="text-zinc-900 font-semibold hover:text-orange-600 transition-colors"
                  >
                    {m.title}
                  </Link>
                  {m.description && (
                    <p className="text-zinc-500 text-sm mt-0.5">{m.description}</p>
                  )}
                  <p className="text-zinc-400 text-xs mt-1">
                    {m.filename} · {formatBytes(m.sizeBytes)}
                  </p>
                </div>
                <MaterialBadge status={m.status} />
              </div>

              {role === 'TENANT_ADMIN' && m.status === 'PENDING_REVIEW' && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => approve.mutate(m.id)}
                    disabled={approve.isPending}
                    className="text-sm font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectId(m.id)}
                    className="text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}

              {role === 'TENANT_ADMIN' && m.status === 'REJECTED' && m.rejectionReason && (
                <p className="text-xs text-red-600 mt-2">Reason: {m.rejectionReason}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-extrabold text-zinc-900 mb-4">Reject Material</h2>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection…"
              rows={3}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => { setRejectId(null); setRejectReason(''); }}
                className="border border-zinc-200 text-zinc-700 font-semibold px-5 py-2.5 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!rejectReason.trim() || reject.isPending}
                onClick={async () => {
                  await reject.mutateAsync({ id: rejectId, reason: rejectReason.trim() });
                  setRejectId(null);
                  setRejectReason('');
                }}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                {reject.isPending ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpload && (
        <MaterialUploadModal
          subjectId={subjectId}
          batchId=""
          onClose={() => { setShowUpload(false); refetch(); }}
        />
      )}
    </div>
  );
}
