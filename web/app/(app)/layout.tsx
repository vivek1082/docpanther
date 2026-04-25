'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  GraduationCap,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';

interface Tenant {
  plan: string;
  educationEnabled: boolean;
}

const BASE_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/cases', icon: Briefcase, label: 'Cases' },
  { href: '/templates', icon: FileText, label: 'Templates' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
];

const BOTTOM_NAV = [
  { href: '/settings', icon: Settings, label: 'Settings' },
];

function NavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? 'bg-orange-50 text-orange-600'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
      }`}
    >
      <Icon size={18} className="flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, user, clearAuth } = useAuthStore();

  // Fetch tenant only for org users (those with orgSlug)
  const { data: tenant } = useQuery<Tenant>({
    queryKey: ['tenant'],
    queryFn: () => api.get('/api/tenants/me').then(r => r.data),
    enabled: !!accessToken && !!user?.orgSlug,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const showEducation =
    tenant?.plan === 'ENTERPRISE' && tenant?.educationEnabled === true;

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
    }
  }, [accessToken, router]);

  async function handleLogout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // ignore errors on logout
    }
    clearAuth();
    router.push('/login');
  }

  if (!accessToken) {
    return null;
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const navItems = showEducation
    ? [...BASE_NAV.slice(0, 2), { href: '/education', icon: GraduationCap, label: 'Education' }, ...BASE_NAV.slice(2)]
    : BASE_NAV;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-zinc-100 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-zinc-100">
          <Link href="/dashboard" className="text-lg font-extrabold text-zinc-900">
            Doc<span className="text-orange-500">Panther</span>
          </Link>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href)}
            />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 space-y-0.5 border-t border-zinc-100 pt-3">
          {BOTTOM_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href)}
            />
          ))}

          {/* User + logout */}
          <div className="mt-2 px-3 py-2.5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <span className="text-orange-600 text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-900 truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-zinc-400 truncate">{user?.email ?? ''}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex-shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
