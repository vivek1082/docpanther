'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, UserPlus, Trash2, ExternalLink } from 'lucide-react';
import { useBatch, useRole, useUnenrollStudent, useRemoveTeacher, useDeleteSubject, useMaterials } from '../../_lib/hooks';
import type { Material, OpenCase, BatchSubject } from '../../_lib/types';
import { SubjectAccordion } from '../../_components/SubjectAccordion';
import { AddSubjectModal } from '../../_components/AddSubjectModal';
import { AssignTeacherModal } from '../../_components/AssignTeacherModal';
import { EnrollStudentsModal } from '../../_components/EnrollStudentsModal';
import { MaterialUploadModal } from '../../_components/MaterialUploadModal';
import { MaterialBadge } from '../../_components/MaterialBadge';

type Tab = 'subjects' | 'students' | 'cases';

function SubjectContent({
  subject,
  batchId,
  role,
}: {
  subject: { id: string; batchId: string; name: string; teacherIds: string[]; materialCount: number };
  batchId: string;
  role: string | null | undefined;
}) {
  const [showAssign, setShowAssign] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const removeTeacher = useRemoveTeacher(batchId);
  const { data: materialsData } = useMaterials(subject.id);
  const materials = materialsData?.content ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Teachers</div>
        {role === 'TENANT_ADMIN' && (
          <button
            onClick={() => setShowAssign(true)}
            className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
          >
            <Plus size={12} /> Assign
          </button>
        )}
      </div>

      {subject.teacherIds.length === 0 ? (
        <p className="text-sm text-zinc-400">No teachers assigned.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {subject.teacherIds.map(tid => (
            <span
              key={tid}
              className="flex items-center gap-1.5 bg-zinc-100 text-zinc-600 text-xs font-mono px-3 py-1 rounded-full"
            >
              {tid.slice(0, 8)}…
              {role === 'TENANT_ADMIN' && (
                <button
                  onClick={() => removeTeacher.mutate({ subjectId: subject.id, userId: tid })}
                  className="text-zinc-400 hover:text-red-500 transition-colors"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="border-t border-zinc-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Materials</div>
          {(role === 'TENANT_ADMIN' || role === 'TEACHER') && (
            <button
              onClick={() => setShowUpload(true)}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
            >
              <Plus size={12} /> Upload
            </button>
          )}
        </div>

        {materials.length === 0 ? (
          <p className="text-sm text-zinc-400">No materials yet.</p>
        ) : (
          <div className="space-y-2">
            {materials.map((m: Material) => (
              <Link
                key={m.id}
                href={`/education/materials/${m.id}`}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-zinc-100 hover:border-zinc-200 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{m.title}</p>
                  <p className="text-xs text-zinc-400">{m.filename}</p>
                </div>
                <MaterialBadge status={m.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {showAssign && (
        <AssignTeacherModal
          subjectId={subject.id}
          batchId={batchId}
          onClose={() => setShowAssign(false)}
        />
      )}
      {showUpload && (
        <MaterialUploadModal
          subjectId={subject.id}
          batchId={batchId}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useRole();
  const { data: batch, isLoading } = useBatch(id);
  const unenroll = useUnenrollStudent(id);
  const deleteSubject = useDeleteSubject(id);

  const [tab, setTab] = useState<Tab>('subjects');
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!batch) return <p className="text-red-600">Batch not found.</p>;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'subjects', label: 'Subjects', count: batch.subjects.length },
    { key: 'students', label: 'Students', count: batch.enrollmentCount },
    { key: 'cases', label: 'Cases', count: batch.openCases.length },
  ];

  return (
    <div>
      <Link
        href="/education/batches"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 text-sm font-medium mb-4 transition-colors"
      >
        <ArrowLeft size={15} />
        Batches
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">{batch.name}</h1>
          {batch.academicYear && (
            <p className="text-zinc-500 text-sm mt-0.5">{batch.academicYear}</p>
          )}
        </div>
        {role === 'TENANT_ADMIN' && (
          <Link
            href={`/cases/new?batchId=${batch.id}`}
            className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-4 py-2 rounded-xl transition-colors text-sm flex items-center gap-2"
          >
            <ExternalLink size={14} />
            Open Case
          </Link>
        )}
      </div>

      <div className="flex border-b border-zinc-100 mb-6 gap-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 bg-zinc-100 text-zinc-500 text-xs px-2 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'subjects' && (
        <div className="space-y-3">
          {batch.subjects.length === 0 && (
            <p className="text-zinc-500 text-sm">No subjects yet.</p>
          )}
          {batch.subjects.map((subject: BatchSubject) => (
            <SubjectAccordion key={subject.id} subject={subject}>
              <div className="flex justify-between items-start">
                <SubjectContent subject={subject} batchId={id} role={role} />
                {role === 'TENANT_ADMIN' && (
                  <button
                    onClick={() => deleteSubject.mutate(subject.id)}
                    className="ml-4 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                    title="Remove subject"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </SubjectAccordion>
          ))}
          {role === 'TENANT_ADMIN' && (
            <button
              onClick={() => setShowAddSubject(true)}
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold text-sm transition-colors mt-2"
            >
              <Plus size={15} />
              Add Subject
            </button>
          )}
        </div>
      )}

      {tab === 'students' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-zinc-500">
              {batch.enrollmentCount} enrolled student{batch.enrollmentCount !== 1 ? 's' : ''}
            </p>
            {role === 'TENANT_ADMIN' && (
              <button
                onClick={() => setShowEnroll(true)}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
              >
                <UserPlus size={14} />
                Enroll Students
              </button>
            )}
          </div>
          <p className="text-zinc-400 text-sm">
            Student list is managed via enrollment records.
          </p>
        </div>
      )}

      {tab === 'cases' && (
        <div className="space-y-2">
          {batch.openCases.length === 0 ? (
            <p className="text-zinc-500 text-sm">No open cases linked to this batch.</p>
          ) : (
            batch.openCases.map((c: OpenCase) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors"
              >
                <span className="text-zinc-900 font-medium text-sm">{c.name}</span>
                <span className="text-xs text-zinc-500">{c.status}</span>
              </Link>
            ))
          )}
        </div>
      )}

      {showAddSubject && (
        <AddSubjectModal batchId={id} onClose={() => setShowAddSubject(false)} />
      )}
      {showEnroll && <EnrollStudentsModal batchId={id} onClose={() => setShowEnroll(false)} />}
    </div>
  );
}
