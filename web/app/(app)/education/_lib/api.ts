import api from '@/lib/api';
import type {
  Batch, BatchDetail, BatchTemplate, Material, StudentStorage, StudentFile, Page,
} from './types';

// Templates
export const getTemplates = (page = 0, size = 20) =>
  api.get<Page<BatchTemplate>>('/api/edu/templates', { params: { page, size } }).then(r => r.data);

export const createTemplate = (data: {
  name: string;
  description?: string;
  subjects: { name: string; order: number }[];
}) => api.post<BatchTemplate>('/api/edu/templates', data).then(r => r.data);

export const getTemplate = (id: string) =>
  api.get<BatchTemplate>(`/api/edu/templates/${id}`).then(r => r.data);

export const updateTemplate = (id: string, data: { name?: string; description?: string }) =>
  api.put<BatchTemplate>(`/api/edu/templates/${id}`, data).then(r => r.data);

export const deleteTemplate = (id: string) =>
  api.delete(`/api/edu/templates/${id}`);

// Batches
export const getBatches = (page = 0, size = 20) =>
  api.get<Page<Batch>>('/api/edu/batches', { params: { page, size } }).then(r => r.data);

export const createBatch = (data: { name: string; academicYear?: string; templateId?: string }) =>
  api.post<Batch>('/api/edu/batches', data).then(r => r.data);

export const getBatch = (id: string) =>
  api.get<BatchDetail>(`/api/edu/batches/${id}`).then(r => r.data);

export const updateBatch = (id: string, data: { name?: string; academicYear?: string }) =>
  api.put<Batch>(`/api/edu/batches/${id}`, data).then(r => r.data);

export const enrollStudents = (batchId: string, studentIds: string[]) =>
  api.post(`/api/edu/batches/${batchId}/enroll`, { studentIds });

export const unenrollStudent = (batchId: string, studentId: string) =>
  api.delete(`/api/edu/batches/${batchId}/enroll/${studentId}`);

// Subjects
export const addSubject = (batchId: string, data: { name: string }) =>
  api.post(`/api/edu/batches/${batchId}/subjects`, data).then(r => r.data);

export const updateSubject = (id: string, data: { name: string }) =>
  api.put(`/api/edu/subjects/${id}`, data).then(r => r.data);

export const deleteSubject = (id: string) =>
  api.delete(`/api/edu/subjects/${id}`);

export const assignTeacher = (subjectId: string, userId: string) =>
  api.post(`/api/edu/subjects/${subjectId}/teachers`, { userId });

export const removeTeacher = (subjectId: string, userId: string) =>
  api.delete(`/api/edu/subjects/${subjectId}/teachers/${userId}`);

// Materials
export const getMaterials = (
  subjectId: string,
  params?: { status?: string; page?: number; size?: number },
) =>
  api
    .get<Page<Material>>('/api/edu/materials', { params: { subjectId, ...params } })
    .then(r => r.data);

export const createMaterial = (data: {
  subjectId: string;
  batchId: string;
  title: string;
  description?: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}) =>
  api
    .post<{ materialId: string; presignedUrl: string }>('/api/edu/materials', data)
    .then(r => r.data);

export const getMaterial = (id: string) =>
  api.get<Material>(`/api/edu/materials/${id}`).then(r => r.data);

export const deleteMaterial = (id: string) =>
  api.delete(`/api/edu/materials/${id}`);

export const approveMaterial = (id: string) =>
  api.put(`/api/edu/materials/${id}/approve`);

export const rejectMaterial = (id: string, reason: string) =>
  api.put(`/api/edu/materials/${id}/reject`, { reason });

export const uploadToS3 = (presignedUrl: string, file: File) =>
  fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

// Student portal
export const getMyBatches = () =>
  api.get('/api/edu/my/batches').then(r => r.data);

export const getMyBatch = (id: string) =>
  api.get(`/api/edu/my/batches/${id}`).then(r => r.data);

export const getMyStorage = () =>
  api.get<StudentStorage>('/api/edu/my/storage').then(r => r.data);

export const getUploadUrl = (data: { filename: string; contentType: string; sizeBytes: number }) =>
  api
    .post<{ presignedUrl: string; s3Key: string }>('/api/edu/my/storage/upload-url', data)
    .then(r => r.data);

export const confirmUpload = (data: { s3Key: string; filename: string; sizeBytes: number }) =>
  api.post<StudentFile>('/api/edu/my/storage/confirm', data).then(r => r.data);

export const getMyFiles = (page = 0, size = 20) =>
  api
    .get<Page<StudentFile>>('/api/edu/my/storage/files', { params: { page, size } })
    .then(r => r.data);

export const deleteMyFile = (id: string) =>
  api.delete(`/api/edu/my/storage/files/${id}`);
