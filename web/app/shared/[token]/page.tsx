'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Lock, Download, FileText, AlertCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

type ViewerState =
  | { kind: 'loading' }
  | { kind: 'password'; filename: string; error?: string }
  | { kind: 'success'; downloadUrl: string; filename: string; contentType: string }
  | { kind: 'expired' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string };

function inferContentType(filename: string): string {
  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  const types: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return types[ext] ?? 'application/octet-stream';
}

export default function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ViewerState>({ kind: 'loading' });
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const access = useCallback(
    async (pwd: string | null, filename: string) => {
      try {
        const res = await fetch(`${API_BASE}/api/shared/${token}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd }),
        });
        if (res.status === 401) {
          setState({
            kind: 'password',
            filename,
            error: pwd != null ? 'Incorrect password. Please try again.' : undefined,
          });
          return;
        }
        if (res.status === 410) {
          setState({ kind: 'expired' });
          return;
        }
        if (!res.ok) {
          setState({ kind: 'error', message: 'Unable to access document.' });
          return;
        }
        const data = await res.json();
        const url: string = data.downloadUrl ?? data.presignedUrl;
        setState({
          kind: 'success',
          downloadUrl: url,
          filename,
          contentType: inferContentType(filename),
        });
      } catch {
        setState({ kind: 'error', message: 'Network error. Please try again.' });
      }
    },
    [token],
  );

  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await fetch(`${API_BASE}/api/shared/${token}`);
        if (res.status === 404) {
          setState({ kind: 'not-found' });
          return;
        }
        if (res.status === 410) {
          setState({ kind: 'expired' });
          return;
        }
        if (!res.ok) {
          setState({ kind: 'error', message: 'Failed to load document.' });
          return;
        }
        const info: { isPasswordProtected: boolean; expiresAt: string | null; filename: string } =
          await res.json();
        if (info.isPasswordProtected) {
          setState({ kind: 'password', filename: info.filename });
        } else {
          await access(null, info.filename);
        }
      } catch {
        setState({ kind: 'error', message: 'Network error. Please try again.' });
      }
    }
    loadInfo();
  }, [token, access]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== 'password') return;
    setSubmitting(true);
    await access(password, state.filename);
    setSubmitting(false);
  }

  // Loading
  if (state.kind === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Loading document…</p>
        </div>
      </div>
    );
  }

  // Password gate
  if (state.kind === 'password') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-orange-50 rounded-full p-3 mb-4">
              <Lock className="w-6 h-6 text-orange-500" />
            </div>
            <h1 className="text-xl font-extrabold text-zinc-900">Password Protected</h1>
            <p className="text-sm text-zinc-500 mt-1 text-center">
              Enter password to view this document
            </p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Verifying…' : 'View Document'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Error states
  if (state.kind === 'not-found') {
    return (
      <ErrorCard
        icon={<FileText className="w-6 h-6 text-zinc-400" />}
        title="Link not found"
        description="This share link doesn't exist or has been removed."
      />
    );
  }

  if (state.kind === 'expired') {
    return (
      <ErrorCard
        icon={<AlertCircle className="w-6 h-6 text-zinc-400" />}
        title="Link unavailable"
        description="This link has expired or reached its maximum number of views."
      />
    );
  }

  if (state.kind === 'error') {
    return (
      <ErrorCard
        icon={<AlertCircle className="w-6 h-6 text-red-500" />}
        title="Something went wrong"
        description={state.message}
      />
    );
  }

  // Document viewer
  const { downloadUrl, filename, contentType } = state;
  const isImage = contentType.startsWith('image/');
  const isPdf = contentType === 'application/pdf';

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 truncate max-w-xs">{filename}</span>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-zinc-900">DocPanther</span>
          <a
            href={downloadUrl}
            download={filename}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        </div>
      </header>

      <main className="flex-1 flex justify-center p-6">
        <div className="w-full max-w-4xl">
          {isPdf && (
            <iframe
              src={downloadUrl}
              className="w-full rounded-2xl shadow-sm border border-zinc-100 bg-white"
              style={{ height: 'calc(100vh - 120px)' }}
              title={filename}
            />
          )}
          {isImage && (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={downloadUrl}
                alt={filename}
                className="max-w-full max-h-screen object-contain rounded-xl"
              />
            </div>
          )}
          {!isPdf && !isImage && (
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-12 flex flex-col items-center gap-4">
              <FileText className="w-12 h-12 text-zinc-400" />
              <p className="text-zinc-700 font-medium text-lg">{filename}</p>
              <p className="text-zinc-500 text-sm">Preview not available for this file type.</p>
              <a
                href={downloadUrl}
                download={filename}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download File
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ErrorCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-zinc-50 rounded-full p-3">{icon}</div>
        </div>
        <h1 className="text-xl font-extrabold text-zinc-900 mb-2">{title}</h1>
        <p className="text-sm text-zinc-500 mb-6">{description}</p>
        <a
          href="/"
          className="inline-block border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
        >
          Go to DocPanther
        </a>
      </div>
    </div>
  );
}
