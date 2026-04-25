'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Plus, Trash2, BookCopy } from 'lucide-react';
import { useTemplates, useDeleteTemplate } from '../_lib/hooks';
import type { BatchTemplate, BatchTemplateSubject } from '../_lib/types';

export default function TemplatesPage() {
  const { data, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const templates = data?.content ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-zinc-900">Batch Templates</h1>
        <Link
          href="/education/templates/new"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          New Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
          <BookCopy size={32} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 mb-4">
            Templates let you reuse subject lists when creating new batches.
          </p>
          <Link
            href="/education/templates/new"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={16} />
            Create first template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t: BatchTemplate) => (
            <div key={t.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="text-zinc-900 font-semibold truncate">{t.name}</h3>
                  {t.description && (
                    <p className="text-zinc-500 text-sm mt-0.5 line-clamp-2">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Delete template "${t.name}"?`)) {
                      deleteTemplate.mutate(t.id);
                    }
                  }}
                  className="text-zinc-300 hover:text-red-500 transition-colors shrink-0"
                  title="Delete template"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="text-sm text-zinc-500">
                <span className="font-semibold text-zinc-700">{t.subjectCount}</span> subject
                {t.subjectCount !== 1 ? 's' : ''}
              </div>

              {t.subjects.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.subjects.slice(0, 4).map((s: BatchTemplateSubject) => (
                    <span
                      key={s.id}
                      className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md"
                    >
                      {s.name}
                    </span>
                  ))}
                  {t.subjects.length > 4 && (
                    <span className="text-xs text-zinc-400">+{t.subjects.length - 4} more</span>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-zinc-100">
                <Link
                  href={`/education/batches/new?templateId=${t.id}`}
                  className="text-sm text-orange-600 hover:text-orange-700 font-semibold transition-colors"
                >
                  Use this template →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
