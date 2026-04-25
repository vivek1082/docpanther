'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import FolderSidebar from '../../dashboard/_components/FolderSidebar';
import ContentArea from '../../dashboard/_components/ContentArea';
import NewFolderModal from '../../dashboard/_components/NewFolderModal';
import { fetchFolder } from '../../dashboard/_components/api';
import type { FsFolderResponse } from '../../dashboard/_components/types';

const EMPTY: FsFolderResponse = {
  folder: { id: '', parentId: null, name: '', ownerId: '', permission: 'OWNER', childCount: 0, caseCount: 0, fileCount: 0, createdAt: '' },
  folders: [],
  files: [],
  cases: [],
};

export default function FolderPage() {
  const params = useParams();
  const folderId = params.id as string;

  const [data, setData] = useState<FsFolderResponse>(EMPTY);
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
    fetchFolder(folderId)
      .then(setData)
      .catch(() => setError('Failed to load folder. Please check your connection.'))
      .finally(() => setLoading(false));
  }, [folderId, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  function openNewFolder(parentId: string | null) {
    setNewFolderModal({ open: true, parentId });
  }

  return (
    <div className="h-full flex overflow-hidden bg-white">
      <FolderSidebar
        activeFolderId={folderId}
        onNewFolder={() => openNewFolder(folderId)}
        refreshKey={refreshKey}
      />

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Breadcrumb */}
        <div className="px-6 py-3 border-b border-zinc-100 bg-white flex-shrink-0">
          <nav className="flex items-center gap-1.5 text-sm">
            <Link
              href="/dashboard"
              className="text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              Home
            </Link>
            {!loading && data.folder.name && (
              <>
                <ChevronRight size={13} className="text-zinc-300" />
                <span className="text-zinc-900 font-semibold truncate max-w-xs">
                  {data.folder.name}
                </span>
              </>
            )}
          </nav>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : (
          <ContentArea
            folderId={folderId}
            folders={data.folders}
            files={data.files}
            cases={data.cases}
            onRefresh={refresh}
            onNewFolder={() => openNewFolder(folderId)}
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
