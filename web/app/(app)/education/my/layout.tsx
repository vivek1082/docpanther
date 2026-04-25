'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, HardDrive } from 'lucide-react';
import { useMyStorage } from '../_lib/hooks';
import { StorageBar } from '../_components/StorageBar';

const navItems = [
  { href: '/education/my', label: 'My Batches', icon: GraduationCap, exact: true },
  { href: '/education/my/storage', label: 'My Storage', icon: HardDrive, exact: false },
];

export default function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: storage } = useMyStorage();

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <aside className="w-56 shrink-0 bg-white border-r border-zinc-100 flex flex-col">
        <div className="px-4 py-5 border-b border-zinc-100">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Student Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        {storage && (
          <div className="px-4 py-4 border-t border-zinc-100">
            <StorageBar storage={storage} />
          </div>
        )}
      </aside>

      <main className="flex-1 p-8 min-w-0">{children}</main>
    </div>
  );
}
