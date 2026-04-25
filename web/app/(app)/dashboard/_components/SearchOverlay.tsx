'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Folder, File, Briefcase, X } from 'lucide-react';
import { searchFs } from './api';
import type { SearchResponse } from './types';

type Props = {
  open: boolean;
  onClose: () => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SearchOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchFs(query.trim()));
      } catch {
        // silent on error
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasResults =
    results && (results.folders.length > 0 || results.files.length > 0 || results.cases.length > 0);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-zinc-100 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
          <Search size={16} className="text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, folders, cases…"
            className="flex-1 text-zinc-900 placeholder:text-zinc-400 focus:outline-none text-sm bg-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {!query && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-zinc-400">Type to search files, folders, and cases</p>
            </div>
          )}

          {query && loading && (
            <p className="text-sm text-zinc-400 px-4 py-4">Searching…</p>
          )}

          {query && !loading && results && !hasResults && (
            <p className="text-sm text-zinc-400 px-4 py-4">No results for &ldquo;{query}&rdquo;</p>
          )}

          {query && !loading && hasResults && (
            <div className="py-2">
              {results!.folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { router.push(`/folder/${f.id}`); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors text-left"
                >
                  <Folder size={16} className="text-orange-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{f.name}</p>
                    <p className="text-xs text-zinc-400">Folder · {f.fileCount} files</p>
                  </div>
                </button>
              ))}
              {results!.files.map((f) => (
                <div
                  key={f.id}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors"
                >
                  <File size={16} className="text-zinc-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{f.name}</p>
                    <p className="text-xs text-zinc-400">File · {formatBytes(f.sizeBytes)}</p>
                  </div>
                </div>
              ))}
              {results!.cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { router.push(`/cases/${c.id}`); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors text-left"
                >
                  <Briefcase size={16} className="text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{c.customerName}</p>
                    <p className="text-xs text-zinc-400">
                      Case · {c.referenceNo} ·{' '}
                      <span
                        className={
                          c.status === 'COMPLETE'
                            ? 'text-green-600'
                            : c.status === 'PARTIAL'
                            ? 'text-orange-500'
                            : 'text-zinc-400'
                        }
                      >
                        {c.status}
                      </span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
