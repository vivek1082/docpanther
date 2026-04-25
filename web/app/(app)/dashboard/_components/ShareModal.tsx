'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Copy, Check } from 'lucide-react';
import { createShareLink } from './api';
import type { SelectedItem } from './types';

type Props = {
  open: boolean;
  item: SelectedItem | null;
  onClose: () => void;
};

export default function ShareModal({ open, item, onClose }: Props) {
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  function resetAndClose() {
    setPassword('');
    setExpiresAt('');
    setMaxViews('');
    setShareLink('');
    setError('');
    setCopied(false);
    onClose();
  }

  async function handleCreate() {
    if (!item) return;
    setLoading(true);
    setError('');
    try {
      const opts: { password?: string; expiresAt?: string; maxViews?: number } = {};
      if (password) opts.password = password;
      if (expiresAt) opts.expiresAt = new Date(expiresAt).toISOString();
      if (maxViews) opts.maxViews = parseInt(maxViews, 10);
      const link = await createShareLink(item.id, opts);
      setShareLink(`${window.location.origin}/shared/${link.token}`);
    } catch {
      setError('Failed to create share link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg border border-zinc-100 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-bold text-zinc-900">
                Share &ldquo;{item?.name}&rdquo;
              </Dialog.Title>
              <button onClick={resetAndClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {!shareLink ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Password <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank for no password"
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Expires at <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Max views <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    value={maxViews}
                    onChange={(e) => setMaxViews(e.target.value)}
                    placeholder="Unlimited"
                    min="1"
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <div className="flex gap-3 justify-end pt-1">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={loading}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating…' : 'Create link'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-zinc-500">Share link created. Anyone with this link can view the file.</p>
                <div className="flex items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <span className="flex-1 text-sm text-zinc-700 truncate font-mono">{shareLink}</span>
                  <button
                    onClick={handleCopy}
                    className="flex-shrink-0 text-zinc-400 hover:text-orange-500 transition-colors p-1"
                    title={copied ? 'Copied!' : 'Copy link'}
                  >
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
                <button
                  onClick={resetAndClose}
                  className="w-full border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
