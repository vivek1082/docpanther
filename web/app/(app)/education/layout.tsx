'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, BookOpen, LayoutTemplate } from 'lucide-react';
import { useRole } from './_lib/hooks';

const adminNav = [
  { href: '/education/batches', label: 'Batches', icon: GraduationCap },
  { href: '/education/templates', label: 'Templates', icon: LayoutTemplate },
];

const teacherNav = [
  { href: '/education/batches', label: 'My Subjects', icon: BookOpen },
];

export default function EducationLayout({ children }: { children: React.ReactNode }) {
  const role = useRole();
  const pathname = usePathname();

  const isStudentPortal = pathname.startsWith('/education/my');

  if (isStudentPortal || role === 'STUDENT') {
    return <>{children}</>;
  }

  const navItems = role === 'TENANT_ADMIN' ? adminNav : teacherNav;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="border-b border-zinc-100 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-1 h-14">
            <span className="text-zinc-400 text-sm font-medium mr-4">Education</span>
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
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
          </div>
        </div>
      </div>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
