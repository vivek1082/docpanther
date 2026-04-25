'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useCreateBatch, useTemplates } from '../../_lib/hooks';
import type { BatchTemplate } from '../../_lib/types';

export default function NewBatchPage() {
  const router = useRouter();
  const createBatch = useCreateBatch();
  const { data: templatesData } = useTemplates();
  const templates = templatesData?.content ?? [];

  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [templateId, setTemplateId] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const batch = await createBatch.mutateAsync({
      name: name.trim(),
      academicYear: academicYear.trim() || undefined,
      templateId: templateId || undefined,
    });
    router.push(`/education/batches/${batch.id}`);
  }

  return (
    <div className="max-w-xl">
      <Link
        href="/education/batches"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Batches
      </Link>

      <h1 className="text-2xl font-extrabold text-zinc-900 mb-6">Create Batch</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Batch name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. IAS Batch 10"
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">
              Academic year <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="e.g. 2025–26"
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">
                From template <span className="font-normal text-zinc-400">(optional)</span>
              </label>
              <select
                value={templateId}
                onChange={e => setTemplateId(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="">No template — start empty</option>
                {templates.map((t: BatchTemplate) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subjectCount} subjects)
                  </option>
                ))}
              </select>
              {templateId && (
                <p className="text-xs text-zinc-500 mt-1">
                  Subjects from this template will be auto-created in the batch.
                </p>
              )}
            </div>
          )}

          {createBatch.error && (
            <p className="text-sm text-red-600">Failed to create batch. Please try again.</p>
          )}

          <div className="flex gap-3 pt-2">
            <Link
              href="/education/batches"
              className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!name.trim() || createBatch.isPending}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              {createBatch.isPending ? 'Creating…' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
