'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../../../lib/api'

interface Tenant {
  id: string
  slug: string
  name: string
  region: string
  plan: string
  logoUrl: string | null
  educationEnabled: boolean
  createdAt: string
}

interface User {
  id: string
  name: string
  email: string
}

interface TenantMember {
  userId: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  joinedAt: string
}

export default function OrgPage() {
  const qc = useQueryClient()
  const [orgName, setOrgName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [educationEnabled, setEducationEnabled] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { data: user } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me').then(r => r.data),
  })

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ['tenant'],
    queryFn: () => api.get('/api/tenants/me').then(r => r.data),
  })

  const { data: members = [] } = useQuery<TenantMember[]>({
    queryKey: ['tenant-members'],
    queryFn: () => api.get('/api/tenants/me/members').then(r => r.data),
    enabled: !!user,
  })

  const isAdmin = members.some(m => m.userId === user?.id && m.role === 'TENANT_ADMIN')

  useEffect(() => {
    if (tenant && !initialized) {
      setOrgName(tenant.name)
      setLogoUrl(tenant.logoUrl ?? '')
      setEducationEnabled(tenant.educationEnabled ?? false)
      setInitialized(true)
    }
  }, [tenant, initialized])

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; logoUrl?: string; educationEnabled?: boolean }) =>
      api.put('/api/tenants/me', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant'] })
      setMsg({ type: 'success', text: 'Organization updated.' })
      setTimeout(() => setMsg(null), 3000)
    },
    onError: () => setMsg({ type: 'error', text: 'Failed to update organization.' }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({ name: orgName, logoUrl: logoUrl || undefined, educationEnabled })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Organization</h2>
        <p className="text-zinc-500 text-sm">Only organization admins can manage these settings.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-6">Organization</h2>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center overflow-hidden shrink-0 border border-orange-100">
          {logoUrl ? (
            <img src={logoUrl} alt={orgName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-orange-600">
              {orgName[0]?.toUpperCase() ?? '?'}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-zinc-900">{tenant?.name}</p>
          <p className="text-sm text-zinc-500">{tenant?.slug}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Organization name</label>
          <input
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Slug</label>
          <input
            value={tenant?.slug ?? ''}
            readOnly
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-400 bg-zinc-50 cursor-not-allowed"
          />
          <p className="text-xs text-zinc-400 mt-1">Slug cannot be changed after org creation.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Logo URL</label>
          <input
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="https://..."
          />
        </div>

        {tenant?.plan === 'ENTERPRISE' && (
          <div className="flex items-center justify-between p-4 border border-zinc-200 rounded-xl">
            <div>
              <p className="text-sm font-medium text-zinc-900">Education module</p>
              <p className="text-xs text-zinc-500 mt-0.5">Enable batch management, materials, and student portal</p>
            </div>
            <button
              type="button"
              onClick={() => setEducationEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                educationEnabled ? 'bg-orange-500' : 'bg-zinc-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  educationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        {msg && (
          <p className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {msg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
