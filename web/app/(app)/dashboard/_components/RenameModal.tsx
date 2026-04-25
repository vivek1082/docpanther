'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { renameFolder, renameFile } from './api';
import type { SelectedItem } from './types';

type Props = {
  open: boolean;
  item: SelectedItem | null;
  onClose: () => void;
  onRenamed: () => void;
};

export default function RenameModal({ open, item, onClose, onRenamed }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setError('');
    }
  }, [item]);

  function handleClose() {
    setError('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !item) return;
    setLoading(true);
    setError('');
    try {
      if (item.type === 'folder') {
        await renameFolder(item.id, name.trim());
      } else {
        await renameFile(item.id, name.trim());
      }
      onRenamed();
      handleClose();
    } catch {
      setError('Failed to rename. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg border border-zinc-100 p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-bold text-zinc-900">
                Rename {item?.type === 'folder' ? 'Folder' : 'File'}
              </Dialog.Title>
              <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
