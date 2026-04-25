'use client';

import { useRef, useState } from 'react';
import { X, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import * as eduApi from '../_lib/api';

interface MaterialUploadModalProps {
  subjectId: string;
  batchId: string;
  onClose: () => void;
}

type Step = 'form' | 'uploading' | 'done' | 'error';

export function MaterialUploadModal({ subjectId, batchId, onClose }: MaterialUploadModalProps) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setStep('uploading');
    try {
      const { presignedUrl } = await eduApi.createMaterial({
        subjectId,
        batchId,
        title: title.trim(),
        description: description.trim() || undefined,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      await eduApi.uploadToS3(presignedUrl, file);
      qc.invalidateQueries({ queryKey: ['edu.materials', subjectId] });
      setStep('done');
    } catch {
      setErrorMsg('Upload failed. Please try again.');
      setStep('error');
    }
  }

  if (step === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload size={20} className="text-green-600" />
          </div>
          <h2 className="text-lg font-extrabold text-zinc-900 mb-1">Material uploaded</h2>
          <p className="text-zinc-500 text-sm mb-6">
            It's now pending admin review before students can see it.
          </p>
          <button
            onClick={onClose}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-zinc-900">Upload Material</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Chapter 3 Notes"
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
              placeholder="Brief description of the material…"
              rows={2}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">File</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 hover:border-orange-300 rounded-xl px-4 py-5 text-center cursor-pointer transition-colors"
            >
              {file ? (
                <p className="text-zinc-700 font-medium text-sm">{file.name}</p>
              ) : (
                <p className="text-zinc-400 text-sm">Click to choose a file</p>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {step === 'error' && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !file || step === 'uploading'}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              {step === 'uploading' ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
