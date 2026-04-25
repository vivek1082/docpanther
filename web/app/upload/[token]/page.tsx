'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

type ItemStatus = 'PENDING' | 'UPLOADED' | 'APPROVED' | 'REJECTED';
type ItemType = 'FILE_UPLOAD' | 'TEXT_INPUT';

interface UploadDocument {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface ChecklistItem {
  id: string;
  name: string;
  description: string | null;
  type: ItemType;
  required: boolean;
  allowMultiple: boolean;
  status: ItemStatus;
  textValue: string | null;
  maxFileSizeMb: number | null;
  allowedFileTypes: string[];
  sortOrder: number;
  documents: UploadDocument[];
}

interface CaseData {
  referenceNo: string;
  customerName: string;
  status: string;
  expiresAt: string | null;
  checklist: ChecklistItem[];
}

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function getTenantSlug(): string {
  if (typeof window === 'undefined') return '';
  const parts = window.location.hostname.split('.');
  if (parts.length < 3) return '';
  return parts[0] === 'app' ? '' : parts[0];
}

function apiHeaders(): Record<string, string> {
  const slug = getTenantSlug();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (slug) headers['X-Tenant-Slug'] = slug;
  return headers;
}

// ── Sub-components ────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-zinc-500 text-sm">Loading your upload portal…</p>
      </div>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold text-zinc-900 mb-2">This link has expired</h1>
        <p className="text-zinc-500 text-sm">Please contact the sender for a new upload link.</p>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold text-zinc-900 mb-2">Link not found</h1>
        <p className="text-zinc-500 text-sm">This upload link is invalid or has been removed.</p>
      </div>
    </div>
  );
}

function SuccessState({ referenceNo, customerName }: { referenceNo: string; customerName: string }) {
  const firstName = customerName.split(' ')[0];
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-2">All done, {firstName}!</h1>
        <p className="text-zinc-500 text-sm">
          All required documents for{' '}
          <span className="font-semibold text-zinc-700">{referenceNo}</span>{' '}
          have been uploaded successfully.
        </p>
        <p className="text-zinc-400 text-xs mt-4">You can now close this window.</p>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === 'UPLOADED' || status === 'APPROVED') {
    return (
      <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
      </svg>
    );
  }
  if (status === 'REJECTED') {
    return (
      <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="w-6 h-6 text-zinc-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
    </svg>
  );
}

function ChecklistItemCard({
  item,
  uploadState,
  textValue,
  onTextChange,
  onFileSelect,
  onTextSubmit,
  submitting,
}: {
  item: ChecklistItem;
  uploadState: UploadState;
  textValue: string;
  onTextChange: (v: string) => void;
  onFileSelect: (file: File) => void;
  onTextSubmit: () => void;
  submitting: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isComplete = item.status === 'UPLOADED' || item.status === 'APPROVED';
  const isRejected = item.status === 'REJECTED';
  const showUploadAction = item.type === 'FILE_UPLOAD' && (item.status === 'PENDING' || isRejected) && !uploadState.uploading;
  const showTextAction = item.type === 'TEXT_INPUT' && (item.status === 'PENDING' || isRejected);

  const acceptAttr = item.allowedFileTypes.length > 0 ? item.allowedFileTypes.join(',') : undefined;

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <StatusIcon status={item.status} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-zinc-900 text-sm">{item.name}</h3>
            {item.required && <span className="text-red-500 text-xs leading-none">*</span>}
          </div>

          {item.description && (
            <p className="text-zinc-500 text-sm mt-0.5 leading-relaxed">{item.description}</p>
          )}

          {isRejected && (
            <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              This item was rejected — please re-upload.
            </p>
          )}

          {isComplete && item.type === 'FILE_UPLOAD' && item.documents.length > 0 && (
            <div className="mt-2 space-y-1">
              {item.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 text-sm text-zinc-600">
                  <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate">{doc.filename}</span>
                </div>
              ))}
            </div>
          )}

          {isComplete && item.type === 'TEXT_INPUT' && item.textValue && (
            <p className="mt-2 text-sm text-zinc-700 bg-zinc-50 px-3 py-2 rounded-lg leading-relaxed">
              {item.textValue}
            </p>
          )}

          {uploadState.uploading && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                <span>Uploading…</span>
                <span>{uploadState.progress}%</span>
              </div>
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-1.5 bg-orange-500 rounded-full transition-all duration-200"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          )}

          {uploadState.error && (
            <p className="mt-2 text-sm text-red-600">{uploadState.error}</p>
          )}

          {showUploadAction && (
            <div className="mt-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={acceptAttr}
                multiple={item.allowMultiple}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onFileSelect(file);
                    e.target.value = '';
                  }
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-[48px] bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {isRejected ? 'Re-upload file' : 'Upload file'}
              </button>
              {item.maxFileSizeMb && (
                <p className="text-xs text-zinc-400 text-center mt-1.5">Max {item.maxFileSizeMb} MB</p>
              )}
              {item.allowedFileTypes.length > 0 && (
                <p className="text-xs text-zinc-400 text-center mt-0.5">
                  Accepted: {item.allowedFileTypes.join(', ')}
                </p>
              )}
            </div>
          )}

          {showTextAction && (
            <div className="mt-3 space-y-2">
              <textarea
                value={textValue}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="Type your answer here…"
                rows={3}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
              />
              <button
                onClick={onTextSubmit}
                disabled={submitting || !textValue.trim()}
                className="w-full min-h-[48px] bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function UploadPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  function computeAllDone(currentItems: ChecklistItem[]): boolean {
    if (currentItems.length === 0) return false;
    return currentItems
      .filter((i) => i.required)
      .every((i) => i.status === 'UPLOADED' || i.status === 'APPROVED');
  }

  function setUploadState(itemId: string, patch: Partial<UploadState>) {
    setUploadStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }));
  }

  function updateItem(updated: ChecklistItem) {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === updated.id ? updated : i));
      setAllDone(computeAllDone(next));
      return next;
    });
  }

  useEffect(() => {
    async function loadCase() {
      try {
        const res = await fetch(`${API_BASE}/api/upload/${token}`, {
          headers: apiHeaders(),
        });

        if (res.status === 410) { setExpired(true); return; }
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) { setNotFound(true); return; }

        const data: CaseData = await res.json();

        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          setExpired(true);
          return;
        }

        const sorted = [...data.checklist].sort((a, b) => a.sortOrder - b.sortOrder);
        setCaseData(data);
        setItems(sorted);
        setAllDone(computeAllDone(sorted));

        const initUpload: Record<string, UploadState> = {};
        const initText: Record<string, string> = {};
        for (const item of sorted) {
          initUpload[item.id] = { uploading: false, progress: 0, error: null };
          if (item.type === 'TEXT_INPUT' && item.textValue) {
            initText[item.id] = item.textValue;
          }
        }
        setUploadStates(initUpload);
        setTextValues(initText);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadCase();
  }, [token]);

  async function handleFileUpload(item: ChecklistItem, file: File) {
    setUploadState(item.id, { uploading: true, progress: 0, error: null });

    try {
      const urlRes = await fetch(
        `${API_BASE}/api/upload/${token}/items/${item.id}/upload-url`,
        {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({
            filename: file.name,
            sizeBytes: file.size,
            mimeType: file.type || 'application/octet-stream',
          }),
        }
      );

      if (urlRes.status === 410) {
        setExpired(true);
        setUploadState(item.id, { uploading: false, error: null });
        return;
      }
      if (urlRes.status === 400) {
        const err = await urlRes.json().catch(() => ({}));
        setUploadState(item.id, {
          uploading: false,
          error: (err as { message?: string }).message ?? 'File type or size not allowed.',
        });
        return;
      }
      if (!urlRes.ok) {
        setUploadState(item.id, { uploading: false, error: 'Could not prepare upload. Please try again.' });
        return;
      }

      const { presignedUrl, s3Key } = (await urlRes.json()) as {
        presignedUrl: string;
        s3Key: string;
      };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadState(item.id, { progress: Math.round((e.loaded / e.total) * 90) });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload to storage failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      setUploadState(item.id, { progress: 95 });

      const confirmRes = await fetch(
        `${API_BASE}/api/upload/${token}/items/${item.id}/confirm`,
        {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({
            filename: file.name,
            sizeBytes: file.size,
            s3Key,
            mimeType: file.type || 'application/octet-stream',
          }),
        }
      );

      if (!confirmRes.ok) {
        setUploadState(item.id, {
          uploading: false,
          error: 'File uploaded but confirmation failed. Please refresh the page.',
        });
        return;
      }

      const doc = (await confirmRes.json()) as UploadDocument;
      const updatedItem: ChecklistItem = {
        ...item,
        status: 'UPLOADED',
        documents: item.allowMultiple ? [...item.documents, doc] : [doc],
      };
      updateItem(updatedItem);
      setUploadState(item.id, { uploading: false, progress: 100, error: null });
    } catch (err) {
      setUploadState(item.id, {
        uploading: false,
        error: err instanceof Error ? err.message : 'Upload failed. Please try again.',
      });
    }
  }

  async function handleTextSubmit(item: ChecklistItem) {
    const value = (textValues[item.id] ?? '').trim();
    if (!value) return;

    setSubmitting((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await fetch(
        `${API_BASE}/api/upload/${token}/items/${item.id}/text`,
        {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ value }),
        }
      );
      if (!res.ok) throw new Error('Submission failed');
      const updated = (await res.json()) as ChecklistItem;
      updateItem(updated);
    } catch {
      // no-op — user can retry
    } finally {
      setSubmitting((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  // ── Render ─────────────────────────────────────────────────

  if (loading) return <LoadingState />;
  if (expired) return <ExpiredState />;
  if (notFound || !caseData) return <NotFoundState />;
  if (allDone) return <SuccessState referenceNo={caseData.referenceNo} customerName={caseData.customerName} />;

  const uploadedCount = items.filter(
    (i) => i.status === 'UPLOADED' || i.status === 'APPROVED'
  ).length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((uploadedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <span className="text-xl font-extrabold text-orange-500 tracking-tight">DocPanther</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">{caseData.referenceNo}</h1>
          <p className="text-zinc-500 mt-1 text-sm">Hello, {caseData.customerName}</p>
        </div>

        {/* Progress card */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-zinc-700">
              {uploadedCount} of {totalCount} document{totalCount !== 1 ? 's' : ''} uploaded
            </span>
            <span className="text-sm font-semibold text-orange-500">{progressPct}%</span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-2 bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-4">
          {items.map((item) => (
            <ChecklistItemCard
              key={item.id}
              item={item}
              uploadState={uploadStates[item.id] ?? { uploading: false, progress: 0, error: null }}
              textValue={textValues[item.id] ?? ''}
              onTextChange={(v) => setTextValues((prev) => ({ ...prev, [item.id]: v }))}
              onFileSelect={(file) => handleFileUpload(item, file)}
              onTextSubmit={() => handleTextSubmit(item)}
              submitting={submitting[item.id] ?? false}
            />
          ))}
        </div>

        <p className="text-center text-xs text-zinc-400 pb-8">
          Secure document collection powered by DocPanther
        </p>
      </main>
    </div>
  );
}
