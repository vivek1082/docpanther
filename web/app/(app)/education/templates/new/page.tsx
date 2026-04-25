'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, GripVertical, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import * as eduApi from '../../_lib/api';

interface SubjectRow {
  id: string;
  name: string;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subjects, setSubjects] = useState<SubjectRow[]>([{ id: crypto.randomUUID(), name: '' }]);

  const create = useMutation({
    mutationFn: () =>
      eduApi.createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        subjects: subjects
          .filter(s => s.name.trim())
          .map((s, i) => ({ name: s.name.trim(), order: i })),
      }),
    onSuccess: () => router.push('/education/templates'),
  });

  function addSubject() {
    setSubjects(prev => [...prev, { id: crypto.randomUUID(), name: '' }]);
  }

  function removeSubject(id: string) {
    setSubjects(prev => prev.filter(s => s.id !== id));
  }

  function updateSubject(id: string, name: string) {
    setSubjects(prev => prev.map(s => (s.id === id ? { ...s, name } : s)));
  }

  const validSubjects = subjects.filter(s => s.name.trim());
  const canSubmit = name.trim() && validSubjects.length > 0 && !create.isPending;

  return (
    <div className="max-w-xl">
      <Link
        href="/education/templates"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Templates
      </Link>

      <h1 className="text-2xl font-extrabold text-zinc-900 mb-6">Create Template</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">Template name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. IAS Foundation Batch"
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-1">
            Description <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What this template is for…"
            rows={2}
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-700 mb-2">
            Subjects <span className="text-zinc-400 font-normal text-xs ml-1">({validSubjects.length} added)</span>
          </label>
          <div className="space-y-2">
            {subjects.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <GripVertical size={14} className="text-zinc-300 shrink-0" />
                <span className="text-xs text-zinc-400 w-5 text-right shrink-0">{i + 1}.</span>
                <input
                  value={s.name}
                  onChange={e => updateSubject(s.id, e.target.value)}
                  placeholder={`Subject name`}
                  className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {subjects.length > 1 && (
                  <button
                    onClick={() => removeSubject(s.id)}
                    className="text-zinc-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addSubject}
            type="button"
            className="mt-2 flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-semibold transition-colors"
          >
            <Plus size={14} />
            Add subject
          </button>
        </div>

        {create.error && (
          <p className="text-sm text-red-600">Failed to create template. Please try again.</p>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/education/templates"
            className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={() => create.mutate()}
            disabled={!canSubmit}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {create.isPending ? 'Creating…' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
