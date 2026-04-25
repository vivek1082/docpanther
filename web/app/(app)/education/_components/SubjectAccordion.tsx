'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { BatchSubject } from '../_lib/types';

interface SubjectAccordionProps {
  subject: BatchSubject;
  children?: React.ReactNode;
}

export function SubjectAccordion({ subject, children }: SubjectAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        open ? 'border-l-4 border-l-orange-200 border-zinc-100' : 'border-zinc-100'
      }`}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronRight
            size={16}
            className={`text-zinc-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className="font-semibold text-zinc-900 truncate">{subject.name}</span>
          <span className="text-zinc-500 text-sm shrink-0">
            {subject.teacherIds.length} teacher{subject.teacherIds.length !== 1 ? 's' : ''} ·{' '}
            {subject.materialCount} material{subject.materialCount !== 1 ? 's' : ''}
          </span>
        </div>
      </button>

      {open && children && (
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">{children}</div>
      )}
    </div>
  );
}
