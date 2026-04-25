import api from '@/lib/api';
import type {
  Folder,
  FileNode,
  FsRootResponse,
  FsFolderResponse,
  SearchResponse,
  ShareLink,
} from './types';

export async function fetchRoot(): Promise<FsRootResponse> {
  const { data } = await api.get<FsRootResponse>('/api/fs');
  return data;
}

export async function fetchFolder(folderId: string): Promise<FsFolderResponse> {
  const { data } = await api.get<FsFolderResponse>(`/api/fs/${folderId}`);
  return data;
}

export async function createFolder(name: string, parentId: string | null): Promise<Folder> {
  const { data } = await api.post<Folder>('/api/fs/folders', { name, parentId });
  return data;
}

export async function renameFolder(id: string, name: string): Promise<Folder> {
  const { data } = await api.put<Folder>(`/api/fs/folders/${id}`, { name });
  return data;
}

export async function deleteFolder(id: string): Promise<void> {
  await api.delete(`/api/fs/folders/${id}`);
}

export async function renameFile(id: string, name: string): Promise<FileNode> {
  const { data } = await api.put<FileNode>(`/api/fs/files/${id}`, { name });
  return data;
}

export async function deleteFile(id: string): Promise<void> {
  await api.delete(`/api/fs/files/${id}`);
}

export async function getUploadUrl(
  folderId: string,
  file: File,
): Promise<{ presignedUrl: string; s3Key: string; expiresAt: string }> {
  const { data } = await api.post(`/api/fs/folders/${folderId}/upload-url`, {
    filename: file.name,
    sizeBytes: file.size,
    mimeType: file.type || 'application/octet-stream',
  });
  return data;
}

export async function confirmUpload(
  folderId: string,
  file: File,
  s3Key: string,
): Promise<FileNode> {
  const { data } = await api.post<FileNode>(`/api/fs/folders/${folderId}/confirm-upload`, {
    filename: file.name,
    sizeBytes: file.size,
    s3Key,
    mimeType: file.type || 'application/octet-stream',
  });
  return data;
}

export async function searchFs(q: string): Promise<SearchResponse> {
  const { data } = await api.get<SearchResponse>('/api/fs/search', { params: { q } });
  return data;
}

export async function createShareLink(
  docId: string,
  opts: { password?: string; expiresAt?: string; maxViews?: number },
): Promise<ShareLink> {
  const { data } = await api.post<ShareLink>(`/api/documents/${docId}/share`, opts);
  return data;
}

export async function accessShareLink(
  token: string,
  password?: string,
): Promise<{ downloadUrl: string; expiresAt: string }> {
  const { data } = await api.post(`/api/shared/${token}/access`, { password: password ?? null });
  return data;
}
