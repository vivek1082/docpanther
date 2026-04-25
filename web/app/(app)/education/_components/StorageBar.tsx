import type { StudentStorage } from '../_lib/types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function StorageBar({ storage }: { storage: StudentStorage }) {
  const usedGb = storage.usedBytes / (1024 * 1024 * 1024);
  const quotaGb = storage.quotaBytes / (1024 * 1024 * 1024);
  const pct = Math.min((storage.usedBytes / storage.quotaBytes) * 100, 100);
  const nearLimit = pct >= 80;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-700 font-medium">Storage</span>
        <span className={`font-semibold ${nearLimit ? 'text-red-600' : 'text-zinc-500'}`}>
          {formatBytes(storage.usedBytes)} of {quotaGb.toFixed(0)} GB used
        </span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${nearLimit ? 'bg-red-500' : 'bg-orange-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
