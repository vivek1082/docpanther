'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import FolderSidebar from './_components/FolderSidebar';
import ContentArea from './_components/ContentArea';
import NewFolderModal from './_components/NewFolderModal';
import { fetchRoot } from './_components/api';
import type { FsRootResponse } from './_components/types';

const EMPTY: FsRootResponse = { folders: [], files: [], cases: [] };

export default function DashboardPage() {
  const [data, setData] = useState<FsRootResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [newFolderModal, setNewFolderModal] = useState({
    open: false,
    parentId: null as string | null,
  });

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchRoot()
      .then(setData)
      .catch((err: unknown) => {
        const apiErr = err as { response?: { data?: { message?: string }; status?: number } };
        const msg = apiErr.response?.data?.message ?? '';
        if (msg.toLowerCase().includes('organisation') || apiErr.response?.status === 400) {
          setError('org-required');
        } else {
          setError('Failed to load files. Please check your connection.');
        }
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  function openNewFolder(parentId: string | null) {
    setNewFolderModal({ open: true, parentId });
  }

  const showFilesystem = !loading && !error;

  return (
    <div className="h-full flex overflow-hidden bg-white">
      {showFilesystem && (
        <FolderSidebar
          activeFolderId={null}
          onNewFolder={() => openNewFolder(null)}
          refreshKey={refreshKey}
        />
      )}

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {showFilesystem && (
          <div className="px-6 py-3 border-b border-zinc-100 bg-white flex-shrink-0">
            <nav className="text-sm">
              <span className="text-zinc-900 font-semibold">Home</span>
            </nav>
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : error === 'org-required' ? (
          <IndividualWelcome />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : (
          <ContentArea
            folderId={null}
            folders={data.folders}
            files={data.files}
            cases={data.cases}
            onRefresh={refresh}
            onNewFolder={() => openNewFolder(null)}
          />
        )}
      </div>

      <NewFolderModal
        open={newFolderModal.open}
        parentId={newFolderModal.parentId}
        onClose={() => setNewFolderModal((m) => ({ ...m, open: false }))}
        onCreated={() => {
          setNewFolderModal((m) => ({ ...m, open: false }));
          refresh();
        }}
      />
    </div>
  );
}

function IndividualWelcome() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h2 className="text-xl font-extrabold text-zinc-900 mb-2">Welcome to DocPanther</h2>
      <p className="text-zinc-500 text-sm max-w-sm mb-6">
        Create cases to collect documents from clients, or explore the Cases section to get started.
      </p>
      <Link
        href="/cases/new"
        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
      >
        Create your first case
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-28 bg-zinc-100 rounded-xl animate-pulse" />
        <div className="h-9 w-20 bg-zinc-100 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center px-4">
        <p className="text-zinc-500 mb-4 text-sm">{message}</p>
        <button
          onClick={onRetry}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
