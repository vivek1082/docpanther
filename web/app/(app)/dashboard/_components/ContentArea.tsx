'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Folder,
  File,
  FileText,
  Image as ImageIcon,
  Archive,
  Briefcase,
  MoreVertical,
  LayoutGrid,
  List,
  Upload,
  Plus,
  Search,
  Pencil,
  Share2,
  Download,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import RenameModal from './RenameModal';
import ShareModal from './ShareModal';
import SearchOverlay from './SearchOverlay';
import { getUploadUrl, confirmUpload, deleteFolder, deleteFile, createShareLink, accessShareLink } from './api';
import type { Folder as FolderType, FileNode, Case, SelectedItem } from './types';

type Props = {
  folderId: string | null;
  folders: FolderType[];
  files: FileNode[];
  cases: Case[];
  onRefresh: () => void;
  onNewFolder: () => void;
};

type UploadTask = { name: string; progress: number; error?: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function FileIcon({ contentType, size = 32 }: { contentType: string; size?: number }) {
  if (contentType.startsWith('image/')) return <ImageIcon size={size} className="text-zinc-400" />;
  if (contentType === 'application/pdf') return <FileText size={size} className="text-zinc-400" />;
  if (contentType.includes('zip') || contentType.includes('archive'))
    return <Archive size={size} className="text-zinc-400" />;
  return <File size={size} className="text-zinc-400" />;
}

function CaseStatusBadge({ status }: { status: Case['status'] }) {
  const styles = {
    PENDING: 'bg-zinc-100 text-zinc-500',
    PARTIAL: 'bg-orange-50 border border-orange-200 text-orange-700',
    COMPLETE: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}

type ItemMenuProps = {
  item: SelectedItem;
  onRename: (item: SelectedItem) => void;
  onShare: (item: SelectedItem) => void;
  onDelete: (item: SelectedItem) => void;
  onDownload?: (item: SelectedItem) => void;
};

function ItemMenu({ item, onRename, onShare, onDelete, onDownload }: ItemMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 transition-all flex-shrink-0"
          aria-label="More actions"
        >
          <MoreVertical size={14} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="bg-white border border-zinc-100 rounded-xl shadow-lg p-1 min-w-[160px] z-50"
          onClick={(e) => e.stopPropagation()}
          sideOffset={4}
          align="end"
        >
          <DropdownMenu.Item
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 rounded-lg hover:bg-zinc-50 cursor-pointer outline-none"
            onSelect={() => onRename(item)}
          >
            <Pencil size={13} />
            Rename
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 rounded-lg hover:bg-zinc-50 cursor-pointer outline-none"
            onSelect={() => onShare(item)}
          >
            <Share2 size={13} />
            Share
          </DropdownMenu.Item>
          {item.type === 'file' && onDownload && (
            <DropdownMenu.Item
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 rounded-lg hover:bg-zinc-50 cursor-pointer outline-none"
              onSelect={() => onDownload(item)}
            >
              <Download size={13} />
              Download
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-zinc-100" />
          <DropdownMenu.Item
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 cursor-pointer outline-none"
            onSelect={() => onDelete(item)}
          >
            <Trash2 size={13} />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

type CardCallbacks = {
  onRename: (item: SelectedItem) => void;
  onShare: (item: SelectedItem) => void;
  onDelete: (item: SelectedItem) => void;
  onDownload: (item: SelectedItem) => void;
};

function FolderCard({ folder, ...cb }: { folder: FolderType } & CardCallbacks) {
  const router = useRouter();
  const item: SelectedItem = { id: folder.id, name: folder.name, type: 'folder' };
  return (
    <div
      className="bg-white rounded-xl border border-zinc-100 hover:border-orange-200 hover:shadow-sm transition-all p-4 cursor-pointer group"
      onClick={() => router.push(`/folder/${folder.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <Folder size={30} className="text-orange-400" />
        <ItemMenu item={item} onRename={cb.onRename} onShare={cb.onShare} onDelete={cb.onDelete} />
      </div>
      <p className="text-sm font-medium text-zinc-900 truncate">{folder.name}</p>
      <p className="text-xs text-zinc-400 mt-0.5">
        {folder.childCount} folder{folder.childCount !== 1 ? 's' : ''} · {folder.fileCount} file
        {folder.fileCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

function FileCard({ file, ...cb }: { file: FileNode } & CardCallbacks) {
  const item: SelectedItem = { id: file.id, name: file.name, type: 'file' };
  return (
    <div className="bg-white rounded-xl border border-zinc-100 hover:border-orange-200 hover:shadow-sm transition-all p-4 group">
      <div className="flex items-start justify-between mb-3">
        <FileIcon contentType={file.contentType} />
        <ItemMenu item={item} onRename={cb.onRename} onShare={cb.onShare} onDelete={cb.onDelete} onDownload={cb.onDownload} />
      </div>
      <p className="text-sm font-medium text-zinc-900 truncate">{file.name}</p>
      <p className="text-xs text-zinc-400 mt-0.5">{formatBytes(file.sizeBytes)}</p>
    </div>
  );
}

function CaseCard({ caseItem }: { caseItem: Case }) {
  return (
    <Link href={`/cases/${caseItem.id}`} className="block">
      <div className="bg-white rounded-xl border border-zinc-100 hover:border-orange-200 hover:shadow-sm transition-all p-4 cursor-pointer">
        <div className="mb-3">
          <Briefcase size={30} className="text-blue-400" />
        </div>
        <p className="text-sm font-medium text-zinc-900 truncate">{caseItem.customerName}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <CaseStatusBadge status={caseItem.status} />
          <p className="text-xs text-zinc-400 truncate">{caseItem.referenceNo}</p>
        </div>
      </div>
    </Link>
  );
}

function GridView({ folders, files, cases, ...cb }: { folders: FolderType[]; files: FileNode[]; cases: Case[] } & CardCallbacks) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {folders.map((f) => <FolderCard key={f.id} folder={f} {...cb} />)}
      {cases.map((c) => <CaseCard key={c.id} caseItem={c} />)}
      {files.map((f) => <FileCard key={f.id} file={f} {...cb} />)}
    </div>
  );
}

function FolderRow({ folder, ...cb }: { folder: FolderType } & CardCallbacks) {
  const router = useRouter();
  const item: SelectedItem = { id: folder.id, name: folder.name, type: 'folder' };
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-zinc-50 cursor-pointer group transition-colors"
      onClick={() => router.push(`/folder/${folder.id}`)}
    >
      <Folder size={18} className="text-orange-400 flex-shrink-0" />
      <span className="flex-1 text-sm font-medium text-zinc-900 truncate">{folder.name}</span>
      <span className="text-xs text-zinc-400 hidden sm:block w-24 text-right">
        {folder.fileCount} files
      </span>
      <span className="text-xs text-zinc-400 hidden sm:block w-28 text-right">
        {formatDate(folder.createdAt)}
      </span>
      <div onClick={(e) => e.stopPropagation()}>
        <ItemMenu item={item} onRename={cb.onRename} onShare={cb.onShare} onDelete={cb.onDelete} />
      </div>
    </div>
  );
}

function FileRow({ file, ...cb }: { file: FileNode } & CardCallbacks) {
  const item: SelectedItem = { id: file.id, name: file.name, type: 'file' };
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-zinc-50 group transition-colors">
      <FileIcon contentType={file.contentType} size={18} />
      <span className="flex-1 text-sm font-medium text-zinc-900 truncate">{file.name}</span>
      <span className="text-xs text-zinc-400 hidden sm:block w-24 text-right">{formatBytes(file.sizeBytes)}</span>
      <span className="text-xs text-zinc-400 hidden sm:block w-28 text-right">{formatDate(file.uploadedAt)}</span>
      <div onClick={(e) => e.stopPropagation()}>
        <ItemMenu item={item} onRename={cb.onRename} onShare={cb.onShare} onDelete={cb.onDelete} onDownload={cb.onDownload} />
      </div>
    </div>
  );
}

function CaseRow({ caseItem }: { caseItem: Case }) {
  return (
    <Link href={`/cases/${caseItem.id}`} className="block">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors">
        <Briefcase size={18} className="text-blue-400 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium text-zinc-900 truncate">{caseItem.customerName}</span>
        <CaseStatusBadge status={caseItem.status} />
        <span className="text-xs text-zinc-400 hidden sm:block w-28 text-right">{formatDate(caseItem.createdAt)}</span>
      </div>
    </Link>
  );
}

function ListView({ folders, files, cases, ...cb }: { folders: FolderType[]; files: FileNode[]; cases: Case[] } & CardCallbacks) {
  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
        <span className="w-4 flex-shrink-0" />
        <span className="flex-1">Name</span>
        <span className="hidden sm:block w-24 text-right">Size</span>
        <span className="hidden sm:block w-28 text-right">Modified</span>
        <span className="w-6" />
      </div>
      <div className="space-y-0.5">
        {folders.map((f) => <FolderRow key={f.id} folder={f} {...cb} />)}
        {cases.map((c) => <CaseRow key={c.id} caseItem={c} />)}
        {files.map((f) => <FileRow key={f.id} file={f} {...cb} />)}
      </div>
    </div>
  );
}

function EmptyState({
  folderId,
  onNewFolder,
  onUpload,
}: {
  folderId: string | null;
  onNewFolder: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 p-5 bg-zinc-50 rounded-2xl">
        <FolderOpen size={40} className="text-zinc-300" />
      </div>
      <h3 className="text-base font-semibold text-zinc-700 mb-1">No files here yet</h3>
      <p className="text-sm text-zinc-400 mb-6 max-w-xs">
        {folderId
          ? 'Upload files or create a folder to get started.'
          : 'Create a folder to organise your files.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onNewFolder}
          className="flex items-center gap-2 border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
        >
          <Plus size={14} />
          New Folder
        </button>
        {folderId && (
          <button
            onClick={onUpload}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
          >
            <Upload size={14} />
            Upload Files
          </button>
        )}
      </div>
    </div>
  );
}

export default function ContentArea({ folderId, folders, files, cases, onRefresh, onNewFolder }: Props) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [renameItem, setRenameItem] = useState<SelectedItem | null>(null);
  const [shareItem, setShareItem] = useState<SelectedItem | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      if (!folderId) return;
      const fileArr = Array.from(fileList);
      setUploads(fileArr.map((f) => ({ name: f.name, progress: 0 })));

      for (let i = 0; i < fileArr.length; i++) {
        const file = fileArr[i];
        const update = (progress: number, error?: string) =>
          setUploads((prev) =>
            prev.map((u, idx) => (idx === i ? { ...u, progress, error } : u)),
          );
        try {
          update(20);
          const { presignedUrl, s3Key } = await getUploadUrl(folderId, file);
          update(50);
          await fetch(presignedUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
          });
          update(80);
          await confirmUpload(folderId, file, s3Key);
          update(100);
        } catch {
          update(0, 'Upload failed');
        }
      }

      setTimeout(() => {
        setUploads([]);
        onRefresh();
      }, 1500);
    },
    [folderId, onRefresh],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!folderId || !e.dataTransfer.files.length) return;
      handleFiles(e.dataTransfer.files);
    },
    [folderId, handleFiles],
  );

  async function handleDelete(item: SelectedItem) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      if (item.type === 'folder') await deleteFolder(item.id);
      else await deleteFile(item.id);
      onRefresh();
    } catch {
      alert('Delete failed. Please try again.');
    }
  }

  async function handleDownload(item: SelectedItem) {
    try {
      const link = await createShareLink(item.id, {});
      const { downloadUrl } = await accessShareLink(link.token);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = item.name;
      a.click();
    } catch {
      alert('Download failed. Please try again.');
    }
  }

  const isEmpty = folders.length === 0 && files.length === 0 && cases.length === 0;

  const callbacks: CardCallbacks = {
    onRename: setRenameItem,
    onShare: setShareItem,
    onDelete: handleDelete,
    onDownload: handleDownload,
  };

  return (
    <div
      className="flex-1 flex flex-col min-h-0 min-w-0 relative"
      onDragOver={(e) => {
        e.preventDefault();
        if (folderId) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && folderId && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-orange-50/90 pointer-events-none">
          <div className="border-2 border-dashed border-orange-300 rounded-2xl bg-orange-50 px-16 py-10">
            <p className="text-orange-600 font-semibold text-lg">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3.5 border-b border-zinc-100 bg-white flex-shrink-0">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-600 border border-zinc-200 hover:border-zinc-300 rounded-xl px-3 py-2 transition-colors min-w-0 flex-1 max-w-xs"
        >
          <Search size={14} className="flex-shrink-0" />
          <span className="truncate">Search files and folders…</span>
        </button>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-orange-50 text-orange-600' : 'text-zinc-400 hover:text-zinc-600'
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-orange-50 text-orange-600' : 'text-zinc-400 hover:text-zinc-600'
            }`}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>

        <button
          onClick={onNewFolder}
          className="flex items-center gap-2 border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-3 py-2 rounded-xl transition-colors text-sm flex-shrink-0"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Folder</span>
        </button>

        <button
          onClick={() => folderId && fileInputRef.current?.click()}
          disabled={!folderId}
          title={folderId ? 'Upload files' : 'Navigate into a folder to upload files'}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-2 rounded-xl transition-colors text-sm flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Upload size={14} />
          <span className="hidden sm:inline">Upload</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="px-6 py-3 bg-orange-50 border-b border-orange-100 space-y-2 flex-shrink-0">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-zinc-600 truncate flex-1 min-w-0">{u.name}</span>
              {u.error ? (
                <span className="text-xs text-red-600 flex-shrink-0">{u.error}</span>
              ) : (
                <div className="w-32 h-1.5 bg-orange-200 rounded-full overflow-hidden flex-shrink-0">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isEmpty ? (
          <EmptyState
            folderId={folderId}
            onNewFolder={onNewFolder}
            onUpload={() => fileInputRef.current?.click()}
          />
        ) : viewMode === 'grid' ? (
          <GridView folders={folders} files={files} cases={cases} {...callbacks} />
        ) : (
          <ListView folders={folders} files={files} cases={cases} {...callbacks} />
        )}
      </div>

      {/* Modals */}
      <RenameModal
        open={renameItem !== null}
        item={renameItem}
        onClose={() => setRenameItem(null)}
        onRenamed={() => { setRenameItem(null); onRefresh(); }}
      />
      <ShareModal
        open={shareItem !== null}
        item={shareItem}
        onClose={() => setShareItem(null)}
      />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
