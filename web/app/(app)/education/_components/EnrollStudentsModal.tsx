'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useEnrollStudents } from '../_lib/hooks';

interface EnrollStudentsModalProps {
  batchId: string;
  onClose: () => void;
}

export function EnrollStudentsModal({ batchId, onClose }: EnrollStudentsModalProps) {
  const [raw, setRaw] = useState('');
  const enroll = useEnrollStudents(batchId);

  const ids = raw
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ids.length) return;
    await enroll.mutateAsync(ids);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-zinc-900">Enroll Students</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">
              Student user IDs
            </label>
            <textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder="One UUID per line, or comma-separated"
              rows={5}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm resize-none"
            />
            {ids.length > 0 && (
              <p className="text-xs text-zinc-500 mt-1">{ids.length} student ID{ids.length !== 1 ? 's' : ''} detected</p>
            )}
          </div>
          {enroll.error && (
            <p className="text-sm text-red-600">Enrollment failed. Check the IDs and try again.</p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!ids.length || enroll.isPending}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              {enroll.isPending ? 'Enrolling…' : `Enroll ${ids.length || ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
