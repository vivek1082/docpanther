'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, Check, X } from 'lucide-react';
import { useMaterial, useRole, useApproveMaterial, useRejectMaterial } from '../../_lib/hooks';
import { MaterialBadge } from '../../_components/MaterialBadge';

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useRole();
  const { data: material, isLoading } = useMaterial(id);
  const approve = useApproveMaterial();
  const reject = useRejectMaterial();
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!material) return <p className="text-red-600">Material not found.</p>;

  return (
    <div className="max-w-2xl">
      <Link
        href={`/education/subjects/${material.subjectId}`}
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to subject
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={20} className="text-orange-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-zinc-900 leading-tight">{material.title}</h1>
              {material.description && (
                <p className="text-zinc-500 text-sm mt-1">{material.description}</p>
              )}
            </div>
          </div>
          <MaterialBadge status={material.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm border-t border-zinc-100 pt-5">
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-0.5">File</p>
            <p className="text-zinc-700 font-medium">{material.filename}</p>
          </div>
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-0.5">Size</p>
            <p className="text-zinc-700 font-medium">{formatBytes(material.sizeBytes)}</p>
          </div>
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-0.5">Uploaded</p>
            <p className="text-zinc-700 font-medium">{formatDate(material.uploadedAt)}</p>
          </div>
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-0.5">Type</p>
            <p className="text-zinc-700 font-medium">{material.contentType}</p>
          </div>
          {material.approvedAt && (
            <div>
              <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-0.5">Approved</p>
              <p className="text-zinc-700 font-medium">{formatDate(material.approvedAt)}</p>
            </div>
          )}
        </div>

        {material.status === 'REJECTED' && material.rejectionReason && (
          <div className="mt-5 p-4 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Rejection reason</p>
            <p className="text-sm text-red-600">{material.rejectionReason}</p>
          </div>
        )}

        {role === 'TENANT_ADMIN' && material.status === 'PENDING_REVIEW' && (
          <div className="flex gap-3 mt-6 pt-5 border-t border-zinc-100">
            <button
              onClick={() => approve.mutate(material.id)}
              disabled={approve.isPending}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Check size={15} />
              {approve.isPending ? 'Approving…' : 'Approve'}
            </button>
            <button
              onClick={() => setShowReject(true)}
              className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <X size={15} />
              Reject
            </button>
          </div>
        )}
      </div>

      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-extrabold text-zinc-900 mb-4">Reject Material</h2>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection…"
              rows={3}
              autoFocus
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => { setShowReject(false); setRejectReason(''); }}
                className="border border-zinc-200 text-zinc-700 font-semibold px-5 py-2.5 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!rejectReason.trim() || reject.isPending}
                onClick={async () => {
                  await reject.mutateAsync({ id: material.id, reason: rejectReason.trim() });
                  setShowReject(false);
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
    </div>
  );
}
