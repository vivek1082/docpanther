'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useAssignTeacher } from '../_lib/hooks';

interface AssignTeacherModalProps {
  subjectId: string;
  batchId: string;
  onClose: () => void;
}

export function AssignTeacherModal({ subjectId, batchId, onClose }: AssignTeacherModalProps) {
  const [userId, setUserId] = useState('');
  const assign = useAssignTeacher(batchId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) return;
    await assign.mutateAsync({ subjectId, userId: userId.trim() });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-zinc-900">Assign Teacher</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Teacher user ID</label>
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="Paste teacher's user ID (UUID)"
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              autoFocus
            />
          </div>
          {assign.error && (
            <p className="text-sm text-red-600">Failed to assign teacher. Check the user ID.</p>
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
              disabled={!userId.trim() || assign.isPending}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              {assign.isPending ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
