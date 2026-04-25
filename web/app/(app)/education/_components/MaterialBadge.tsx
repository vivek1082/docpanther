import type { MaterialStatus } from '../_lib/types';

const config: Record<MaterialStatus, { label: string; className: string }> = {
  PENDING_REVIEW: { label: 'Pending Review', className: 'bg-zinc-100 text-zinc-600' },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-600' },
};

export function MaterialBadge({ status }: { status: MaterialStatus }) {
  const { label, className } = config[status];
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${className}`}>{label}</span>
  );
}
