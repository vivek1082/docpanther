'use client'

export const dynamic = 'force-dynamic'

import { useQuery } from '@tanstack/react-query'
import api from '../../../../lib/api'

interface Tenant {
  id: string
  slug: string
  name: string
  region: string
  plan: string
  logoUrl: string | null
  createdAt: string
}

const REGION_LABEL: Record<string, string> = {
  'ap-south-1': 'Asia Pacific — Mumbai',
  'us-east-1': 'United States — N. Virginia',
  'eu-central-1': 'Europe — Frankfurt',
  'me-central-1': 'Middle East — UAE',
}

const REGION_FLAG: Record<string, string> = {
  'ap-south-1': '🇮🇳',
  'us-east-1': '🇺🇸',
  'eu-central-1': '🇩🇪',
  'me-central-1': '🇦🇪',
}

const REGION_COMPLIANCE: Record<string, string[]> = {
  'ap-south-1': ['DPDP Act', 'ISO 27001'],
  'us-east-1': ['SOC 2', 'HIPAA', 'ISO 27001'],
  'eu-central-1': ['GDPR', 'ISO 27001'],
  'me-central-1': ['ISO 27001'],
}

export default function RegionPage() {
  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ['tenant'],
    queryFn: () => api.get('/api/tenants/me').then(r => r.data),
  })

  if (isLoading) {
    return <div className="h-48 bg-zinc-100 rounded-2xl animate-pulse" />
  }

  const region = tenant?.region ?? ''
  const compliance = REGION_COMPLIANCE[region] ?? []

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-6">
          Data region
        </h2>

        <div className="flex items-center gap-4 p-5 bg-zinc-50 rounded-xl border border-zinc-100 mb-6">
          <span className="text-4xl leading-none">{REGION_FLAG[region] ?? '🌐'}</span>
          <div>
            <p className="font-semibold text-zinc-900 text-lg">
              {REGION_LABEL[region] ?? region ?? '—'}
            </p>
            <p className="text-sm text-zinc-500 font-mono">{region || '—'}</p>
          </div>
        </div>

        {compliance.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-zinc-700 mb-2">Compliance in this region</p>
            <div className="flex flex-wrap gap-2">
              {compliance.map(c => (
                <span
                  key={c}
                  className="bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1 rounded-full"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
          <svg
            className="w-5 h-5 text-orange-500 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-orange-700">Region is locked</p>
            <p className="text-sm text-orange-600 mt-1">
              Your data region was selected during organization setup and cannot be changed. All data
              is stored and processed exclusively in this region.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
