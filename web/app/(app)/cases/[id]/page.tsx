'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Send,
  Download,
  FileText,
  Type as TypeIcon,
  Clock,
  ExternalLink,
} from 'lucide-react';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Document {
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
  type: 'FILE_UPLOAD' | 'TEXT_INPUT';
  required: boolean;
  allowMultiple: boolean;
  status: 'PENDING' | 'UPLOADED' | 'APPROVED' | 'REJECTED';
  textValue: string | null;
  documents: Document[];
  sortOrder: number;
}

interface Case {
  id: string;
  referenceNo: string;
  customerName: string;
  customerEmail: string;
  status: 'PENDING' | 'PARTIAL' | 'COMPLETE';
  storageMode: 'FLAT' | 'STRUCTURED';
  uploadUrl: string;
  expiresAt: string | null;
  totalItems: number;
  uploadedItems: number;
  createdAt: string;
  tags: string[];
  checklist: ChecklistItem[];
}

interface AuditLog {
  id: string;
  action: string;
  actorType: 'ADMIN' | 'CUSTOMER';
  actorId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

interface ShareLink {
  id: string;
  token: string;
  isPasswordProtected: boolean;
  expiresAt: string | null;
  viewCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CASE_STATUS_BADGE: Record<Case['status'], string> = {
  PENDING: 'bg-zinc-100 text-zinc-600',
  PARTIAL: 'bg-orange-50 text-orange-600 border border-orange-200',
  COMPLETE: 'bg-green-100 text-green-700',
};

const ITEM_CARD_STYLE: Record<ChecklistItem['status'], string> = {
  PENDING: 'bg-white border-zinc-100',
  UPLOADED: 'bg-orange-50 border-orange-200',
  APPROVED: 'bg-green-50 border-green-200',
  REJECTED: 'bg-red-50 border-red-200',
};

const ITEM_CHIP: Record<
  ChecklistItem['status'],
  { cls: string; label: string }
> = {
  PENDING: { cls: 'bg-zinc-100 text-zinc-500', label: 'Pending' },
  UPLOADED: { cls: 'bg-orange-100 text-orange-600', label: 'Uploaded' },
  APPROVED: { cls: 'bg-green-100 text-green-700', label: 'Approved' },
  REJECTED: { cls: 'bg-red-100 text-red-600', label: 'Rejected' },
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatAction(action: string) {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CaseStatusBadge({ status }: { status: Case['status'] }) {
  return (
    <span
      className={`rounded-full px-3 py-0.5 text-xs font-semibold ${CASE_STATUS_BADGE[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function ProgressRing({
  uploaded,
  total,
}: {
  uploaded: number;
  total: number;
}) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? uploaded / total : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="#f4f4f5"
          strokeWidth="6"
        />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="#f97316"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-bold text-zinc-900">{uploaded}</span>
        <span className="text-xs text-zinc-400">/{total}</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CaseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);

  // Map docId → ShareLink token for display
  const [sharedTokens, setSharedTokens] = useState<Record<string, string>>({});

  const loadCase = useCallback(async () => {
    try {
      const [caseRes, auditRes] = await Promise.all([
        api.get<Case>(`/api/cases/${id}`),
        api.get<PageResponse<AuditLog>>(`/api/cases/${id}/audit`),
      ]);
      setCaseData(caseRes.data);
      setAuditLogs(auditRes.data.content);
    } catch {
      setError('Failed to load case. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  async function approveItem(itemId: string) {
    setActionLoading(itemId);
    try {
      await api.put(`/api/cases/${id}/items/${itemId}`, {
        status: 'APPROVED',
      });
      await loadCase();
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectItem(itemId: string) {
    setRejectConfirm(null);
    setActionLoading(itemId);
    try {
      await api.put(`/api/cases/${id}/items/${itemId}`, {
        status: 'REJECTED',
      });
      await loadCase();
    } finally {
      setActionLoading(null);
    }
  }

  async function shareDocument(docId: string) {
    try {
      const { data } = await api.post<ShareLink>(
        `/api/documents/${docId}/share`,
        {},
      );
      setSharedTokens((prev) => ({ ...prev, [docId]: data.token }));
    } catch {}
  }

  function copySharedLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/shared/${token}`);
  }

  function copyUploadUrl() {
    if (!caseData) return;
    navigator.clipboard.writeText(caseData.uploadUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  async function sendReminder() {
    await api.post(`/api/cases/${id}/remind`).catch(() => {});
  }

  function downloadZip() {
    const base = process.env.NEXT_PUBLIC_API_URL ?? '';
    window.open(`${base}/api/cases/${id}/download`);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-zinc-400 text-sm">
        Loading…
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-sm">{error || 'Case not found'}</p>
          <Link
            href="/cases"
            className="mt-3 inline-block text-sm text-orange-500 hover:underline"
          >
            Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  const checklist = [...(caseData.checklist ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back */}
        <Link
          href="/cases"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Cases
        </Link>

        {/* ── Case header card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <ProgressRing
                uploaded={caseData.uploadedItems}
                total={caseData.totalItems}
              />
              <div>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="text-xl font-extrabold text-zinc-900 font-mono">
                    {caseData.referenceNo}
                  </h1>
                  <CaseStatusBadge status={caseData.status} />
                </div>
                <p className="text-zinc-800 font-semibold">{caseData.customerName}</p>
                <p className="text-zinc-400 text-sm">{caseData.customerEmail}</p>
                {caseData.expiresAt && (
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                    <Clock size={11} />
                    Expires{' '}
                    {new Date(caseData.expiresAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={sendReminder}
                className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Send size={13} />
                Remind
              </button>
              <button
                onClick={downloadZip}
                className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Download size={13} />
                Download ZIP
              </button>
            </div>
          </div>

          {/* Upload link row */}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 bg-zinc-100 rounded-xl px-4 py-2.5 font-mono text-xs text-zinc-600 truncate">
              {caseData.uploadUrl}
            </div>
            <button
              onClick={copyUploadUrl}
              className="shrink-0 p-2.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
              title="Copy upload link"
            >
              {copiedUrl ? (
                <Check size={14} className="text-green-600" />
              ) : (
                <Copy size={14} className="text-zinc-500" />
              )}
            </button>
          </div>
          {caseData.tags.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {caseData.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-zinc-100 text-zinc-500 text-xs font-medium px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Main content: checklist + audit ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checklist */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-zinc-900 mb-3">
              Checklist
              <span className="ml-2 text-sm font-normal text-zinc-400">
                ({caseData.uploadedItems}/{caseData.totalItems} uploaded)
              </span>
            </h2>

            {checklist.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center text-zinc-400 text-sm">
                No checklist items
              </div>
            ) : (
              <div className="space-y-3">
                {checklist.map((item) => {
                  const chipCfg = ITEM_CHIP[item.status];
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 transition-colors ${ITEM_CARD_STYLE[item.status]}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Item header */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {item.type === 'FILE_UPLOAD' ? (
                              <FileText
                                size={13}
                                className="text-zinc-400 shrink-0"
                              />
                            ) : (
                              <TypeIcon
                                size={13}
                                className="text-zinc-400 shrink-0"
                              />
                            )}
                            <span className="font-semibold text-zinc-900 text-sm">
                              {item.name}
                            </span>
                            {item.required && (
                              <span className="text-zinc-400 text-xs">
                                *required
                              </span>
                            )}
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${chipCfg.cls}`}
                            >
                              {chipCfg.label}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-xs text-zinc-500 mb-2">
                              {item.description}
                            </p>
                          )}

                          {/* TEXT_INPUT value */}
                          {item.type === 'TEXT_INPUT' && item.textValue && (
                            <div className="mt-2 bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-700 whitespace-pre-wrap">
                              {item.textValue}
                            </div>
                          )}

                          {/* FILE_UPLOAD documents */}
                          {item.type === 'FILE_UPLOAD' &&
                            item.documents.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {item.documents.map((doc) => (
                                  <div key={doc.id}>
                                    <div className="flex items-center justify-between bg-white border border-zinc-100 rounded-xl px-3 py-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText
                                          size={12}
                                          className="text-zinc-300 shrink-0"
                                        />
                                        <span className="text-xs text-zinc-700 font-medium truncate">
                                          {doc.filename}
                                        </span>
                                        <span className="text-xs text-zinc-400 shrink-0">
                                          {formatBytes(doc.sizeBytes)}
                                        </span>
                                      </div>
                                      {item.status === 'APPROVED' && (
                                        <button
                                          onClick={() => shareDocument(doc.id)}
                                          className="shrink-0 flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-semibold ml-3 transition-colors"
                                        >
                                          <ExternalLink size={11} />
                                          Share
                                        </button>
                                      )}
                                    </div>

                                    {/* Shared link display */}
                                    {sharedTokens[doc.id] && (
                                      <div className="mt-1 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                                        <span className="flex-1 font-mono text-xs text-orange-700 truncate">
                                          {window.location.origin}/shared/
                                          {sharedTokens[doc.id]}
                                        </span>
                                        <button
                                          onClick={() =>
                                            copySharedLink(sharedTokens[doc.id])
                                          }
                                          className="shrink-0 text-orange-500 hover:text-orange-600 transition-colors"
                                          title="Copy shared link"
                                        >
                                          <Copy size={12} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>

                        {/* Approve / Reject buttons for UPLOADED FILE items */}
                        {item.status === 'UPLOADED' &&
                          item.type === 'FILE_UPLOAD' && (
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => approveItem(item.id)}
                                disabled={actionLoading === item.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 size={12} />
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectConfirm(item.id)}
                                disabled={actionLoading === item.id}
                                className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                              >
                                <XCircle size={12} />
                                Reject
                              </button>
                            </div>
                          )}
                      </div>

                      {/* Reject confirmation */}
                      {rejectConfirm === item.id && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-sm text-red-700 font-medium mb-2">
                            Reject this document?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => rejectItem(item.id)}
                              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              Yes, reject
                            </button>
                            <button
                              onClick={() => setRejectConfirm(null)}
                              className="px-3 py-1.5 border border-red-200 hover:bg-white text-red-600 text-xs font-semibold rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Audit timeline */}
          <div>
            <h2 className="text-lg font-bold text-zinc-900 mb-3">Activity</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-4 sticky top-6">
              {auditLogs.length === 0 ? (
                <p className="text-zinc-400 text-sm text-center py-6">
                  No activity yet
                </p>
              ) : (
                <div className="space-y-0">
                  {auditLogs.map((log, i) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            log.actorType === 'ADMIN'
                              ? 'bg-orange-400'
                              : 'bg-zinc-300'
                          }`}
                        />
                        {i < auditLogs.length - 1 && (
                          <div className="w-px flex-1 bg-zinc-100 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-xs font-semibold text-zinc-700 leading-tight">
                          {formatAction(log.action)}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {log.actorType === 'ADMIN' ? 'Admin' : 'Customer'}
                          {' · '}
                          {new Date(log.createdAt).toLocaleDateString(
                            undefined,
                            {
                              day: 'numeric',
                              month: 'short',
                            },
                          )}{' '}
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
