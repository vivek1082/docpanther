'use client'

export const dynamic = 'force-dynamic'

import { useQuery } from '@tanstack/react-query'
import api from '../../../../lib/api'

interface Tenant {
  id: string
  slug: string
  name: string
  region: string
  plan: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE'
  logoUrl: string | null
  createdAt: string
}

interface Usage {
  storageBytesUsed: number
  caseCount: number
}

const PLAN_META: Record<
  string,
  { label: string; storageLimitGb: number; features: string[]; price: string }
> = {
  FREE: {
    label: 'Free',
    storageLimitGb: 1,
    price: '₹0 / month',
    features: ['1 GB storage', 'Up to 5 team members', 'Basic case management'],
  },
  STARTER: {
    label: 'Starter',
    storageLimitGb: 10,
    price: '₹999 / month',
    features: ['10 GB storage', 'Up to 25 team members', 'Email notifications', 'Case templates'],
  },
  GROWTH: {
    label: 'Growth',
    storageLimitGb: 100,
    price: '₹3,999 / month',
    features: [
      '100 GB storage',
      'Unlimited team members',
      'Priority support',
      'Audit logs',
      'Custom branding',
    ],
  },
  ENTERPRISE: {
    label: 'Enterprise',
    storageLimitGb: 1000,
    price: 'Custom',
    features: [
      '1 TB+ storage',
      'Custom integrations',
      'SLA guarantee',
      'Dedicated support',
      'SSO / SAML',
    ],
  },
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-orange-500 shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

export default function BillingPage() {
  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ['tenant'],
    queryFn: () => api.get('/api/tenants/me').then(r => r.data),
  })

  const { data: usage } = useQuery<Usage>({
    queryKey: ['tenant-usage'],
    queryFn: () => api.get('/api/tenants/me/usage').then(r => r.data),
    enabled: !!tenant,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-40 bg-zinc-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  const plan = (tenant?.plan ?? 'FREE') as keyof typeof PLAN_META
  const meta = PLAN_META[plan] ?? PLAN_META.FREE
  const canUpgrade = plan === 'FREE' || plan === 'STARTER'

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-6">
          Current plan
        </h2>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold text-zinc-900">{meta.label}</span>
              <span className="bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                Active
              </span>
            </div>
            <p className="text-sm text-zinc-500">{meta.price}</p>
            <ul className="space-y-1.5">
              {meta.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-zinc-700">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {canUpgrade && (
            <button
              onClick={() => alert('Contact sales to upgrade your plan.')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap text-sm"
            >
              Upgrade plan
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">
          Usage
        </h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-700">Storage used</span>
              <span className="text-zinc-500">
                {usage ? formatBytes(usage.storageBytesUsed) : '—'} / {meta.storageLimitGb} GB
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{
                  width: usage
                    ? `${Math.min(100, (usage.storageBytesUsed / (meta.storageLimitGb * 1024 * 1024 * 1024)) * 100).toFixed(1)}%`
                    : '0%',
                }}
              />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-700">Total cases</span>
            <span className="text-zinc-900 font-medium">{usage?.caseCount ?? '—'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Account</h2>
        <dl className="space-y-3 text-sm">
          {[
            { label: 'Organization', value: tenant?.name },
            { label: 'Slug', value: tenant?.slug },
            { label: 'Region', value: tenant?.region },
            {
              label: 'Member since',
              value: tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : undefined,
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-zinc-900 font-medium">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
