'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useAddSubject } from '../_lib/hooks';

interface AddSubjectModalProps {
  batchId: string;
  onClose: () => void;
}

export function AddSubjectModal({ batchId, onClose }: AddSubjectModalProps) {
  const [name, setName] = useState('');
  const add = useAddSubject(batchId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await add.mutateAsync({ name: name.trim() });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-zinc-900">Add Subject</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Subject name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. IAS History"
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
          </div>
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
              disabled={!name.trim() || add.isPending}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              {add.isPending ? 'Adding…' : 'Add Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
