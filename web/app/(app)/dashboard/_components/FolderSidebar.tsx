'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Home,
  Plus,
} from 'lucide-react';
import { fetchRoot, fetchFolder } from './api';
import type { Folder as FolderType } from './types';

type TreeFolder = FolderType & {
  children: TreeFolder[];
  isLoaded: boolean;
};

type Props = {
  activeFolderId: string | null;
  onNewFolder: () => void;
  refreshKey?: number;
};

export default function FolderSidebar({ activeFolderId, onNewFolder, refreshKey = 0 }: Props) {
  const [tree, setTree] = useState<TreeFolder[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRoot()
      .then(({ folders }) => {
        setTree(folders.map((f) => ({ ...f, children: [], isLoaded: false })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const toggleExpand = useCallback(
    async (folder: TreeFolder) => {
      const id = folder.id;
      if (expanded.has(id)) {
        setExpanded((prev) => {
          const s = new Set(prev);
          s.delete(id);
          return s;
        });
        return;
      }
      setExpanded((prev) => new Set([...Array.from(prev), id]));
      if (!folder.isLoaded) {
        try {
          const { folders: children } = await fetchFolder(id);
          setTree((prev) => updateTree(prev, id, children));
        } catch {
          // ignore
        }
      }
    },
    [expanded],
  );

  return (
    <aside className="w-56 flex-shrink-0 bg-zinc-50 border-r border-zinc-100 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">My Files</span>
        <button
          onClick={onNewFolder}
          title="New Folder"
          className="text-zinc-400 hover:text-orange-500 transition-colors p-0.5 rounded"
        >
          <Plus size={15} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
            activeFolderId === null
              ? 'bg-orange-50 text-orange-700 font-medium'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <Home size={14} className="flex-shrink-0" />
          Home
        </Link>

        {loading ? (
          <div className="space-y-1 px-2 py-2">
            {[70, 55, 80].map((w, i) => (
              <div
                key={i}
                className="h-3.5 bg-zinc-200 rounded animate-pulse"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        ) : (
          tree.map((folder) => (
            <FolderTreeNode
              key={folder.id}
              folder={folder}
              depth={0}
              expanded={expanded}
              activeFolderId={activeFolderId}
              onToggle={toggleExpand}
            />
          ))
        )}
      </nav>

    </aside>
  );
}

function FolderTreeNode({
  folder,
  depth,
  expanded,
  activeFolderId,
  onToggle,
}: {
  folder: TreeFolder;
  depth: number;
  expanded: Set<string>;
  activeFolderId: string | null;
  onToggle: (f: TreeFolder) => void;
}) {
  const isExpanded = expanded.has(folder.id);
  const isActive = folder.id === activeFolderId;
  const hasChildren = folder.childCount > 0;

  return (
    <div>
      <div
        className={`flex items-center rounded-lg text-sm transition-colors group ${
          isActive ? 'bg-orange-50 text-orange-700 font-medium' : 'text-zinc-600 hover:bg-zinc-100'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          onClick={() => onToggle(folder)}
          className="flex-shrink-0 p-1.5 text-zinc-400 group-hover:text-zinc-500 rounded"
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
          ) : (
            <span className="w-3 inline-block" />
          )}
        </button>
        <Link
          href={`/folder/${folder.id}`}
          className="flex items-center gap-2 flex-1 min-w-0 py-1.5 pr-2"
        >
          {isExpanded ? (
            <FolderOpen size={14} className={isActive ? 'text-orange-500 flex-shrink-0' : 'text-orange-400 flex-shrink-0'} />
          ) : (
            <Folder size={14} className={isActive ? 'text-orange-500 flex-shrink-0' : 'text-orange-400 flex-shrink-0'} />
          )}
          <span className="truncate">{folder.name}</span>
        </Link>
      </div>
      {isExpanded && folder.children.length > 0 && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              expanded={expanded}
              activeFolderId={activeFolderId}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function updateTree(tree: TreeFolder[], id: string, children: FolderType[]): TreeFolder[] {
  return tree.map((node) => {
    if (node.id === id) {
      return {
        ...node,
        isLoaded: true,
        children: children.map((c) => ({ ...c, children: [], isLoaded: false })),
      };
    }
    if (node.children.length > 0) {
      return { ...node, children: updateTree(node.children, id, children) };
    }
    return node;
  });
}
