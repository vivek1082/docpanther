export type MaterialStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type UserRole = 'TENANT_ADMIN' | 'TEACHER' | 'STUDENT';

export interface BatchTemplateSubject {
  id: string;
  templateId: string;
  name: string;
  defaultTeacherId: string | null;
  order: number;
}

export interface BatchTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  subjectCount: number;
  subjects: BatchTemplateSubject[];
  createdAt: string;
}

export interface Batch {
  id: string;
  tenantId: string;
  name: string;
  academicYear: string | null;
  templateId: string | null;
  enrollmentCount: number;
  subjectCount: number;
  createdAt: string;
}

export interface BatchSubject {
  id: string;
  batchId: string;
  name: string;
  teacherIds: string[];
  materialCount: number;
}

export interface OpenCase {
  id: string;
  name: string;
  status: string;
}

export interface BatchDetail extends Batch {
  subjects: BatchSubject[];
  openCases: OpenCase[];
}

export interface Material {
  id: string;
  subjectId: string;
  batchId: string;
  title: string;
  description: string | null;
  s3Key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  status: MaterialStatus;
  uploadedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  uploadedAt: string;
}

export interface StudentStorage {
  userId: string;
  tenantId: string;
  usedBytes: number;
  quotaBytes: number;
}

export interface StudentFile {
  id: string;
  userId: string;
  filename: string;
  contentType: string;
  s3Key: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface Page<T> {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}
