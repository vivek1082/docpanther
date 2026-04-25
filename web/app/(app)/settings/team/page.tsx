'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../../../lib/api'

interface TenantMember {
  userId: string
  name: string
  email: string
  role: 'TENANT_ADMIN' | 'TENANT_MEMBER' | 'TEACHER' | 'STUDENT'
  avatarUrl: string | null
  joinedAt: string
}

interface User {
  id: string
  name: string
  email: string
}

const ROLE_BADGE: Record<string, string> = {
  TENANT_ADMIN: 'bg-orange-50 border border-orange-200 text-orange-700',
  TENANT_MEMBER: 'bg-zinc-100 border border-zinc-200 text-zinc-600',
  TEACHER: 'bg-blue-50 border border-blue-200 text-blue-700',
  STUDENT: 'bg-purple-50 border border-purple-200 text-purple-700',
}

const ROLE_LABEL: Record<string, string> = {
  TENANT_ADMIN: 'Admin',
  TENANT_MEMBER: 'Member',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden shrink-0">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-orange-600">{name[0]?.toUpperCase()}</span>
      )}
    </div>
  )
}

export default function TeamPage() {
  const qc = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'TENANT_ADMIN' | 'TENANT_MEMBER'>('TENANT_MEMBER')
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const { data: user } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me').then(r => r.data),
  })

  const { data: members = [], isLoading } = useQuery<TenantMember[]>({
    queryKey: ['tenant-members'],
    queryFn: () => api.get('/api/tenants/me/members').then(r => r.data),
  })

  const currentMember = members.find(m => m.userId === user?.id)
  const isAdmin = currentMember?.role === 'TENANT_ADMIN'

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api.post('/api/tenants/me/members', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-members'] })
      setInviteEmail('')
      setInviteMsg({ type: 'success', text: 'Invitation sent.' })
      setTimeout(() => setInviteMsg(null), 3000)
    },
    onError: () => setInviteMsg({ type: 'error', text: 'Failed to send invitation.' }),
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.put(`/api/tenants/me/members/${userId}`, { role }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-members'] }),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/api/tenants/me/members/${userId}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-members'] })
      setConfirmRemove(null)
    },
  })

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-6">
          Team members
        </h2>

        <div className="divide-y divide-zinc-100">
          {members.map(member => (
            <div key={member.userId} className="flex items-center gap-3 py-4">
              <Avatar name={member.name} avatarUrl={member.avatarUrl} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-900 truncate text-sm">
                  {member.name}
                  {member.userId === user?.id && (
                    <span className="ml-2 text-xs text-zinc-400">(you)</span>
                  )}
                </p>
                <p className="text-xs text-zinc-500 truncate">{member.email}</p>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  ROLE_BADGE[member.role] ?? 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {ROLE_LABEL[member.role] ?? member.role}
              </span>
              <p className="text-xs text-zinc-400 hidden sm:block w-20 text-right">
                {new Date(member.joinedAt).toLocaleDateString()}
              </p>
              {isAdmin && member.userId !== user?.id && (
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={member.role}
                    onChange={e => roleMutation.mutate({ userId: member.userId, role: e.target.value })}
                    className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="TENANT_ADMIN">Admin</option>
                    <option value="TENANT_MEMBER">Member</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="STUDENT">Student</option>
                  </select>
                  {confirmRemove === member.userId ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => removeMutation.mutate(member.userId)}
                        disabled={removeMutation.isPending}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="text-xs text-zinc-400 hover:text-zinc-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(member.userId)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-6">
            Invite member
          </h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 min-w-0 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'TENANT_ADMIN' | 'TENANT_MEMBER')}
                className="border border-zinc-200 rounded-xl px-4 py-3 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="TENANT_MEMBER">Member</option>
                <option value="TENANT_ADMIN">Admin</option>
              </select>
              <button
                type="submit"
                disabled={inviteMutation.isPending || !inviteEmail}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {inviteMutation.isPending ? 'Sending…' : 'Send invite'}
              </button>
            </div>
            {inviteMsg && (
              <p
                className={`text-sm ${inviteMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
              >
                {inviteMsg.text}
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
