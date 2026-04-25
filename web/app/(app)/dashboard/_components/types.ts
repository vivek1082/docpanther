export type Folder = {
  id: string;
  parentId: string | null;
  name: string;
  ownerId: string;
  permission: 'OWNER' | 'EDIT' | 'VIEW';
  childCount: number;
  caseCount: number;
  fileCount: number;
  createdAt: string;
};

export type FileNode = {
  id: string;
  folderId: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
};

export type Case = {
  id: string;
  folderId: string | null;
  referenceNo: string;
  customerName: string;
  customerEmail: string;
  tags: string[];
  status: 'PENDING' | 'PARTIAL' | 'COMPLETE';
  storageMode: 'FLAT' | 'STRUCTURED';
  uploadUrl: string;
  expiresAt: string | null;
  maxFileSizeMb: number;
  allowedFileTypes: string[];
  totalItems: number;
  uploadedItems: number;
  createdAt: string;
  updatedAt: string;
};

export type ShareLink = {
  id: string;
  documentId: string;
  token: string;
  isPasswordProtected: boolean;
  expiresAt: string | null;
  maxViews: number | null;
  viewCount: number;
  createdAt: string;
};

export type FsRootResponse = {
  folders: Folder[];
  files: FileNode[];
  cases: Case[];
};

export type FsFolderResponse = {
  folder: Folder;
  folders: Folder[];
  files: FileNode[];
  cases: Case[];
};

export type SearchResponse = {
  folders: Folder[];
  files: FileNode[];
  cases: Case[];
};

export type SelectedItem = {
  id: string;
  name: string;
  type: 'folder' | 'file';
};
