'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/settings/profile', label: 'Profile' },
  { href: '/settings/org', label: 'Organization' },
  { href: '/settings/team', label: 'Team' },
  { href: '/settings/billing', label: 'Billing' },
  { href: '/settings/region', label: 'Region' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-8 max-w-5xl mx-auto px-6 py-8">
      <nav className="w-[140px] shrink-0 space-y-1">
        <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wide px-3 mb-3">
          Settings
        </p>
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
              pathname === item.href
                ? 'bg-orange-50 text-orange-700 font-medium'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
