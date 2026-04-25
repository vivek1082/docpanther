'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import type { UserRole } from './types';
import * as eduApi from './api';

export function useRole(): UserRole | null | undefined {
  const user = useAuthStore(s => s.user);
  if (user === null) return undefined; // not loaded yet
  return (user as any)?.role ?? null;
}

// Templates
export function useTemplates(page = 0) {
  return useQuery({ queryKey: ['edu.templates', page], queryFn: () => eduApi.getTemplates(page) });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['edu.template', id],
    queryFn: () => eduApi.getTemplate(id),
    enabled: !!id,
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eduApi.deleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edu.templates'] }),
  });
}

// Batches
export function useBatches(page = 0) {
  return useQuery({ queryKey: ['edu.batches', page], queryFn: () => eduApi.getBatches(page) });
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: ['edu.batch', id],
    queryFn: () => eduApi.getBatch(id),
    enabled: !!id,
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eduApi.createBatch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edu.batches'] }),
  });
}

export function useUpdateBatch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; academicYear?: string }) => eduApi.updateBatch(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edu.batch', id] }),
  });
}

export function useEnrollStudents(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentIds: string[]) => eduApi.enrollStudents(batchId, studentIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edu.batch', batchId] }),
  });
}

export function useUnenrollStudent(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => eduApi.unenrollStudent(batchId, studentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edu.batch', batchId] }),
  });
}

// Subjects
export function useAddSubject(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => eduApi.addSubject(batchId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edu.batch', batchId] }),
  });
}

export function useDeleteSubject(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eduApi.deleteSubject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edu.batch', batchId] }),
  });
}

export function useAssignTeacher(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subjectId, userId }: { subjectId: string; userId: string }) =>
      eduApi.assignTeacher(subjectId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edu.batch', batchId] }),
  });
}

export function useRemoveTeacher(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subjectId, userId }: { subjectId: string; userId: string }) =>
      eduApi.removeTeacher(subjectId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edu.batch', batchId] }),
  });
}

// Materials
export function useMaterials(subjectId: string, params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ['edu.materials', subjectId, params],
    queryFn: () => eduApi.getMaterials(subjectId, params),
    enabled: !!subjectId,
  });
}

export function useMaterial(id: string) {
  return useQuery({
    queryKey: ['edu.material', id],
    queryFn: () => eduApi.getMaterial(id),
    enabled: !!id,
  });
}

export function useApproveMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eduApi.approveMaterial,
    onSuccess: (_data: unknown, id: string) => {
      qc.invalidateQueries({ queryKey: ['edu.material', id] });
      qc.invalidateQueries({ queryKey: ['edu.materials'] });
    },
  });
}

export function useRejectMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      eduApi.rejectMaterial(id, reason),
    onSuccess: (_data: unknown, { id }: { id: string; reason: string }) => {
      qc.invalidateQueries({ queryKey: ['edu.material', id] });
      qc.invalidateQueries({ queryKey: ['edu.materials'] });
    },
  });
}

export function useDeleteMaterial(subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eduApi.deleteMaterial,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edu.materials', subjectId] }),
  });
}

// Student portal
export function useMyBatches() {
  return useQuery({ queryKey: ['edu.my.batches'], queryFn: eduApi.getMyBatches });
}

export function useMyBatch(id: string) {
  return useQuery({
    queryKey: ['edu.my.batch', id],
    queryFn: () => eduApi.getMyBatch(id),
    enabled: !!id,
  });
}

export function useMyStorage() {
  return useQuery({ queryKey: ['edu.my.storage'], queryFn: eduApi.getMyStorage });
}

export function useMyFiles(page = 0) {
  return useQuery({ queryKey: ['edu.my.files', page], queryFn: () => eduApi.getMyFiles(page) });
}

export function useDeleteMyFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: eduApi.deleteMyFile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['edu.my.files'] });
      qc.invalidateQueries({ queryKey: ['edu.my.storage'] });
    },
  });
}
