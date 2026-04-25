'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  FileUp,
  Type as TypeIcon,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  X,
  LayoutTemplate,
} from 'lucide-react';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  tag: string | null;
  isGlobal: boolean;
  itemCount: number;
  createdAt: string;
}

interface TemplateItem {
  id: string;
  name: string;
  description: string | null;
  type: 'FILE_UPLOAD' | 'TEXT_INPUT';
  required: boolean;
  allowMultiple: boolean;
  sortOrder: number;
}

interface TemplateDetail extends Template {
  items: TemplateItem[];
}

interface NewItem {
  name: string;
  type: 'FILE_UPLOAD' | 'TEXT_INPUT';
  required: boolean;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Expand / detail
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<TemplateDetail | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newItems, setNewItems] = useState<NewItem[]>([
    { name: '', type: 'FILE_UPLOAD', required: true },
  ]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Inline edit (name + tag only)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    api
      .get<Template[]>('/api/templates')
      .then((r) => setTemplates(r.data))
      .finally(() => setLoading(false));
  }

  async function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
      setExpandedData(null);
      return;
    }
    setExpanded(id);
    setExpandedData(null);
    setExpandLoading(true);
    try {
      const { data } = await api.get<TemplateDetail>(`/api/templates/${id}`);
      setExpandedData(data);
    } finally {
      setExpandLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.post<Template>('/api/templates', {
        name: newName.trim(),
        tag: newTag.trim() || undefined,
        items: newItems
          .filter((i) => i.name.trim())
          .map((item, idx) => ({
            name: item.name.trim(),
            type: item.type,
            required: item.required,
            sortOrder: idx,
          })),
      });
      setNewName('');
      setNewTag('');
      setNewItems([{ name: '', type: 'FILE_UPLOAD', required: true }]);
      setShowCreate(false);
      await loadTemplates();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setCreateError(e.response?.data?.message ?? 'Failed to create template.');
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(id: string) {
    setEditSaving(true);
    try {
      const { data } = await api.put<Template>(`/api/templates/${id}`, {
        name: editName.trim() || undefined,
        tag: editTag.trim() || undefined,
      });
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: data.name, tag: data.tag } : t)),
      );
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await api.delete(`/api/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (expanded === id) {
        setExpanded(null);
        setExpandedData(null);
      }
    } finally {
      setDeleting(null);
    }
  }

  // New item helpers
  function addNewItem() {
    setNewItems([...newItems, { name: '', type: 'FILE_UPLOAD', required: true }]);
  }

  function updateNewItem(i: number, patch: Partial<NewItem>) {
    setNewItems(newItems.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  function removeNewItem(i: number) {
    setNewItems(newItems.filter((_, idx) => idx !== i));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900">Templates</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              Reusable checklist templates for document collection
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setCreateError('');
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            New Template
          </button>
        </div>

        {/* ── Create form ── */}
        {showCreate && (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 mb-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-5">New Template</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Template Name
                  </label>
                  <input
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Loan Application"
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="w-36">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Tag{' '}
                    <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="e.g. Banking"
                    className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Checklist Items
                </label>
                <div className="space-y-2">
                  {newItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-3 border border-zinc-100 rounded-xl bg-zinc-50/50"
                    >
                      <input
                        value={item.name}
                        onChange={(e) => updateNewItem(i, { name: e.target.value })}
                        placeholder="Item name"
                        className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                      />
                      {/* Type toggle */}
                      <div className="flex gap-1 shrink-0">
                        {(['FILE_UPLOAD', 'TEXT_INPUT'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => updateNewItem(i, { type })}
                            title={type === 'FILE_UPLOAD' ? 'File upload' : 'Text input'}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              item.type === type
                                ? 'bg-orange-500 text-white'
                                : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300'
                            }`}
                          >
                            {type === 'FILE_UPLOAD' ? (
                              <FileUp size={11} />
                            ) : (
                              <TypeIcon size={11} />
                            )}
                          </button>
                        ))}
                      </div>
                      {/* Required toggle */}
                      <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={item.required}
                          onChange={(e) =>
                            updateNewItem(i, { required: e.target.checked })
                          }
                          className="accent-orange-500"
                        />
                        Req
                      </label>
                      <button
                        type="button"
                        onClick={() => removeNewItem(i)}
                        className="text-zinc-300 hover:text-red-500 transition-colors shrink-0"
                        aria-label="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addNewItem}
                    className="w-full border border-dashed border-zinc-200 rounded-xl py-2.5 text-xs text-zinc-400 hover:border-orange-300 hover:text-orange-500 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={13} />
                    Add Item
                  </button>
                </div>
              </div>

              {createError && (
                <p className="text-red-600 text-sm">{createError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Template list ── */}
        {loading ? (
          <div className="text-center py-20 text-zinc-400 text-sm">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20">
            <LayoutTemplate size={40} className="mx-auto text-zinc-200 mb-3" />
            <p className="text-zinc-500 font-semibold">No templates yet</p>
            <p className="text-zinc-400 text-sm mt-1">
              Create a template to reuse checklists across cases
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 mt-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              <Plus size={15} />
              New Template
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-2xl shadow-sm border border-zinc-100"
              >
                {/* Card header */}
                <div className="flex items-center gap-3 p-4">
                  {editingId === t.id ? (
                    /* Inline edit form */
                    <div
                      className="flex-1 flex items-center gap-2 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border border-zinc-200 rounded-lg px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 w-52"
                        autoFocus
                      />
                      <input
                        value={editTag}
                        onChange={(e) => setEditTag(e.target.value)}
                        placeholder="Tag"
                        className="border border-zinc-200 rounded-lg px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 w-28"
                      />
                      <button
                        onClick={() => handleSaveEdit(t.id)}
                        disabled={editSaving}
                        className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                      >
                        <Check size={12} />
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 text-zinc-600 text-xs font-semibold rounded-lg hover:border-zinc-300 transition-colors"
                      >
                        <X size={12} />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    /* Clickable title row */
                    <button
                      onClick={() => toggleExpand(t.id)}
                      className="flex-1 min-w-0 text-left flex items-center gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-zinc-900">
                            {t.name}
                          </span>
                          {t.tag && (
                            <span className="text-xs font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                              {t.tag}
                            </span>
                          )}
                          {t.isGlobal && (
                            <span className="text-xs font-medium bg-orange-50 text-orange-500 border border-orange-200 px-2 py-0.5 rounded-full">
                              Global
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {t.itemCount} item{t.itemCount !== 1 ? 's' : ''} ·
                          Created{' '}
                          {new Date(t.createdAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                      {expanded === t.id ? (
                        <ChevronUp size={15} className="text-zinc-300 shrink-0" />
                      ) : (
                        <ChevronDown size={15} className="text-zinc-300 shrink-0" />
                      )}
                    </button>
                  )}

                  {/* Action icons */}
                  {editingId !== t.id && (
                    <div className="flex gap-0.5 shrink-0 ml-1">
                      <button
                        onClick={() => {
                          setEditingId(t.id);
                          setEditName(t.name);
                          setEditTag(t.tag ?? '');
                        }}
                        className="p-2 text-zinc-300 hover:text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors"
                        title="Rename"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                        className="p-2 text-zinc-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded item list */}
                {expanded === t.id && (
                  <div className="border-t border-zinc-100 px-4 py-3">
                    {expandLoading && !expandedData ? (
                      <p className="text-zinc-400 text-xs text-center py-3">
                        Loading items…
                      </p>
                    ) : expandedData && expandedData.items.length > 0 ? (
                      <div className="space-y-1.5">
                        {[...expandedData.items]
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((item, i) => (
                            <div
                              key={item.id ?? i}
                              className="flex items-center gap-3 px-3 py-2.5 bg-zinc-50 rounded-xl"
                            >
                              <span className="text-zinc-300 shrink-0">
                                {item.type === 'FILE_UPLOAD' ? (
                                  <FileUp size={13} />
                                ) : (
                                  <TypeIcon size={13} />
                                )}
                              </span>
                              <span className="flex-1 text-sm text-zinc-700">
                                {item.name}
                              </span>
                              {item.description && (
                                <span className="text-xs text-zinc-400 truncate max-w-[160px]">
                                  {item.description}
                                </span>
                              )}
                              <div className="flex gap-2 shrink-0">
                                <span className="text-xs text-zinc-400">
                                  {item.type === 'FILE_UPLOAD' ? 'File' : 'Text'}
                                </span>
                                {item.required && (
                                  <span className="text-xs text-zinc-400">
                                    · Required
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-zinc-400 text-xs text-center py-3">
                        No items in this template
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
