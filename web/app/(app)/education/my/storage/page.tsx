'use client';

export const dynamic = 'force-dynamic';

import { useRef, useState, useCallback } from 'react';
import { Upload, Trash2, File } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useMyStorage, useMyFiles, useDeleteMyFile } from '../../_lib/hooks';
import type { StudentFile } from '../../_lib/types';
import { StorageBar } from '../../_components/StorageBar';
import * as eduApi from '../../_lib/api';

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error' | 'quota_exceeded';

export default function StoragePage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: storage, isLoading: storageLoading } = useMyStorage();
  const { data: filesData, isLoading: filesLoading } = useMyFiles();
  const deleteFile = useDeleteMyFile();

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [dragOver, setDragOver] = useState(false);

  const files = filesData?.content ?? [];

  async function handleUpload(file: File) {
    if (!file) return;

    if (storage && storage.usedBytes + file.size > storage.quotaBytes) {
      setUploadState('quota_exceeded');
      return;
    }

    setUploadState('uploading');
    try {
      const { presignedUrl, s3Key } = await eduApi.getUploadUrl({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      await eduApi.uploadToS3(presignedUrl, file);
      await eduApi.confirmUpload({ s3Key, filename: file.name, sizeBytes: file.size });
      qc.invalidateQueries({ queryKey: ['edu.my.files'] });
      qc.invalidateQueries({ queryKey: ['edu.my.storage'] });
      setUploadState('done');
      setTimeout(() => setUploadState('idle'), 2000);
    } catch {
      setUploadState('error');
    }
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [storage],
  );

  const isLoading = storageLoading || filesLoading;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-zinc-900 mb-6">My Storage</h1>

      {storage && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 mb-6">
          <StorageBar storage={storage} />
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-6 ${
          dragOver
            ? 'border-orange-400 bg-orange-50'
            : uploadState === 'uploading'
            ? 'border-zinc-300 bg-zinc-50 cursor-not-allowed'
            : 'border-zinc-200 hover:border-orange-300 hover:bg-orange-50/50'
        }`}
      >
        {uploadState === 'uploading' ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-zinc-600 font-medium">Uploading…</span>
          </div>
        ) : uploadState === 'done' ? (
          <p className="text-green-600 font-semibold">File uploaded successfully.</p>
        ) : uploadState === 'quota_exceeded' ? (
          <p className="text-red-600 font-semibold">Not enough storage space.</p>
        ) : uploadState === 'error' ? (
          <p className="text-red-600 font-semibold">Upload failed. Please try again.</p>
        ) : (
          <>
            <Upload size={24} className="text-zinc-300 mx-auto mb-2" />
            <p className="text-zinc-500 font-medium text-sm">
              Drag & drop a file here, or click to browse
            </p>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = '';
        }}
      />

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[150px]">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
          <File size={32} className="text-zinc-300 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">No files yet. Upload your first file above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
            {filesData && filesData.totalElements > files.length && (
              <span className="text-xs text-zinc-400">{filesData.totalElements} total</span>
            )}
          </div>
          <div className="divide-y divide-zinc-100">
            {files.map((f: StudentFile) => (
              <div key={f.id} className="flex items-center justify-between px-5 py-3 group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
                    <File size={14} className="text-zinc-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{f.filename}</p>
                    <p className="text-xs text-zinc-400">
                      {formatBytes(f.sizeBytes)} · {formatDate(f.uploadedAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${f.filename}"?`)) {
                      deleteFile.mutate(f.id);
                    }
                  }}
                  className="text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete file"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
