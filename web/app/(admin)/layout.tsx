'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!accessToken) { router.replace('/login'); return; }
    if (user && user.role !== 'SUPER_ADMIN') { router.replace('/dashboard'); }
  }, [accessToken, user, router]);

  if (!accessToken || !user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-extrabold text-orange-500 tracking-tight">DocPanther</span>
          <span className="text-xs font-semibold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">SUPERADMIN</span>
        </div>
        <span className="text-sm text-zinc-400">{user.email}</span>
      </header>

      <div className="flex">
        <nav className="w-56 border-r border-zinc-800 min-h-[calc(100vh-57px)] p-4 space-y-1">
          {[
            { label: 'Platform Stats', href: '/admin' },
            { label: 'Tenants', href: '/admin/tenants' },
            { label: 'Pods', href: '/admin/pods' },
            { label: 'User Lookup', href: '/admin/users' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
