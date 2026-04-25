'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, FileUp, Type, Copy, Check, Send } from 'lucide-react';
import api from '@/lib/api';

interface Template {
  id: string;
  name: string;
  tag: string | null;
  isGlobal: boolean;
  itemCount: number;
  createdAt: string;
}

interface NewItem {
  name: string;
  type: 'FILE_UPLOAD' | 'TEXT_INPUT';
  required: boolean;
}

interface CreatedCase {
  id: string;
  referenceNo: string;
  customerName: string;
  uploadUrl: string;
}

const STEPS = ['Case Info', 'Checklist', 'Share'];

export default function NewCasePage() {
  const [step, setStep] = useState(0);

  // Step 1
  const [referenceNo, setReferenceNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [storageMode, setStorageMode] = useState<'FLAT' | 'STRUCTURED'>('STRUCTURED');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Step 2
  const [createdCase, setCreatedCase] = useState<CreatedCase | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [items, setItems] = useState<NewItem[]>([
    { name: '', type: 'FILE_UPLOAD', required: true },
  ]);
  const [buildMode, setBuildMode] = useState<'template' | 'scratch'>('scratch');
  const [savingItems, setSavingItems] = useState(false);

  // Step 3
  const [copied, setCopied] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  useEffect(() => {
    if (step === 1) {
      api
        .get<Template[]>('/api/templates')
        .then((r) => setTemplates(r.data))
        .catch(() => {});
    }
  }, [step]);

  async function handleCreateCase(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        referenceNo,
        customerName,
        customerEmail,
        storageMode,
      };
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();
      const { data } = await api.post<CreatedCase>('/api/cases', body);
      setCreatedCase(data);
      setStep(1);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setCreateError(e.response?.data?.message ?? 'Failed to create case. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  async function handleBuildChecklist() {
    if (!createdCase) return;
    setSavingItems(true);
    try {
      if (buildMode === 'template' && selectedTemplate) {
        await api.post(`/api/templates/${selectedTemplate}/apply/${createdCase.id}`);
      } else {
        const validItems = items.filter((i) => i.name.trim());
        for (let idx = 0; idx < validItems.length; idx++) {
          const item = validItems[idx];
          await api.post(`/api/cases/${createdCase.id}/items`, {
            name: item.name.trim(),
            type: item.type,
            required: item.required,
            sortOrder: idx,
          });
        }
      }
    } catch {
      // proceed to share even if items fail
    } finally {
      setSavingItems(false);
      setStep(2);
    }
  }

  function addItem() {
    setItems([...items, { name: '', type: 'FILE_UPLOAD', required: true }]);
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, patch: Partial<NewItem>) {
    setItems(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  function copyUploadUrl() {
    if (!createdCase) return;
    navigator.clipboard.writeText(createdCase.uploadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendReminder() {
    if (!createdCase) return;
    await api.post(`/api/cases/${createdCase.id}/remind`).catch(() => {});
    setReminderSent(true);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link
          href="/cases"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Cases
        </Link>

        <h1 className="text-2xl font-extrabold text-zinc-900 mb-6">New Case</h1>

        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i <= step
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                <span
                  className={`text-sm font-medium transition-colors ${
                    i === step ? 'text-zinc-900' : 'text-zinc-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-px mx-3 transition-colors ${
                    i < step ? 'bg-orange-300' : 'bg-zinc-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Case Info ── */}
        {step === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-5">Case Information</h2>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Reference Number
                </label>
                <input
                  required
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. CASE-2024-001"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Customer Name
                </label>
                <input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Customer Email
                </label>
                <input
                  required
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Expiry Date{' '}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Storage Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['FLAT', 'STRUCTURED'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setStorageMode(mode)}
                      className={`border rounded-xl px-4 py-3 text-sm font-semibold transition-colors text-left ${
                        storageMode === mode
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <div>{mode.charAt(0) + mode.slice(1).toLowerCase()}</div>
                      <div className="text-xs font-normal mt-0.5 text-zinc-400">
                        {mode === 'FLAT'
                          ? 'All files in one folder'
                          : 'Organised by checklist item'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {createError && (
                <p className="text-red-600 text-sm">{createError}</p>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating…' : 'Continue'}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 2: Checklist ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-5">Build Checklist</h2>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {(['template', 'scratch'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setBuildMode(mode)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    buildMode === mode
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  {mode === 'template' ? 'Use Template' : 'Build from Scratch'}
                </button>
              ))}
            </div>

            {buildMode === 'template' ? (
              <div className="space-y-2 mb-4">
                {templates.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400 text-sm">
                    No templates yet.{' '}
                    <button
                      onClick={() => setBuildMode('scratch')}
                      className="text-orange-500 hover:underline"
                    >
                      Build from scratch
                    </button>
                  </div>
                ) : (
                  templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-colors ${
                        selectedTemplate === t.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-zinc-100 hover:border-zinc-200 bg-zinc-50/50'
                      }`}
                    >
                      <div className="font-semibold text-zinc-900 text-sm">{t.name}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {t.itemCount} items{t.tag ? ` · ${t.tag}` : ''}
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 border border-zinc-100 rounded-xl bg-zinc-50/50"
                  >
                    <div className="flex-1 space-y-2">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(i, { name: e.target.value })}
                        placeholder="e.g. Passport copy"
                        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      />
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {(['FILE_UPLOAD', 'TEXT_INPUT'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => updateItem(i, { type })}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                item.type === type
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300'
                              }`}
                            >
                              {type === 'FILE_UPLOAD' ? (
                                <FileUp size={11} />
                              ) : (
                                <Type size={11} />
                              )}
                              {type === 'FILE_UPLOAD' ? 'File' : 'Text'}
                            </button>
                          ))}
                        </div>
                        <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.required}
                            onChange={(e) =>
                              updateItem(i, { required: e.target.checked })
                            }
                            className="accent-orange-500"
                          />
                          Required
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="text-zinc-300 hover:text-red-500 transition-colors mt-2 shrink-0"
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addItem}
                  className="w-full border border-dashed border-zinc-200 rounded-xl py-3 text-sm text-zinc-400 hover:border-orange-300 hover:text-orange-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  Add Item
                </button>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(0)}
                className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
              >
                Back
              </button>
              <button
                onClick={handleBuildChecklist}
                disabled={
                  savingItems ||
                  (buildMode === 'template' && !selectedTemplate)
                }
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingItems ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Share ── */}
        {step === 2 && createdCase && (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900">Case Created!</h2>
              <p className="text-zinc-500 text-sm mt-1">
                Share this link with{' '}
                <span className="font-semibold text-zinc-700">
                  {createdCase.customerName}
                </span>{' '}
                to start collecting documents.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Upload Link
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-100 rounded-xl px-4 py-3 font-mono text-xs text-zinc-600 break-all leading-relaxed">
                  {createdCase.uploadUrl}
                </div>
                <button
                  onClick={copyUploadUrl}
                  className="shrink-0 p-3 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
                  title="Copy link"
                >
                  {copied ? (
                    <Check size={15} className="text-green-600" />
                  ) : (
                    <Copy size={15} className="text-zinc-500" />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-green-600 mt-1.5">Link copied to clipboard!</p>
              )}
            </div>

            <button
              onClick={sendReminder}
              disabled={reminderSent}
              className="w-full flex items-center justify-center gap-2 border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-6 py-3 rounded-xl transition-colors text-sm disabled:opacity-60 mb-3"
            >
              <Send size={14} />
              {reminderSent ? 'Reminder sent!' : 'Send email to customer'}
            </button>

            <Link
              href={`/cases/${createdCase.id}`}
              className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              View Case
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
