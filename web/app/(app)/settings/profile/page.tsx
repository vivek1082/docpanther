'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../../../lib/api'

interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  emailVerified: boolean
  createdAt: string
}

type Msg = { type: 'success' | 'error'; text: string }

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-6">{title}</h2>
      {children}
    </div>
  )
}

function FieldMsg({ msg }: { msg: Msg | null }) {
  if (!msg) return null
  return (
    <p className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
      {msg.text}
    </p>
  )
}

export default function ProfilePage() {
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [profileMsg, setProfileMsg] = useState<Msg | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<Msg | null>(null)

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me').then(r => r.data),
  })

  useEffect(() => {
    if (user && !initialized) {
      setName(user.name)
      setAvatarUrl(user.avatarUrl ?? '')
      setInitialized(true)
    }
  }, [user, initialized])

  const profileMutation = useMutation({
    mutationFn: (data: { name: string; avatarUrl?: string }) =>
      api.put('/api/auth/me', data).then(r => r.data),
    onSuccess: () => {
      setProfileMsg({ type: 'success', text: 'Profile updated.' })
      setTimeout(() => setProfileMsg(null), 3000)
    },
    onError: () => setProfileMsg({ type: 'error', text: 'Failed to update profile.' }),
  })

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.put('/api/auth/me', data).then(r => r.data),
    onSuccess: () => {
      setPasswordMsg({ type: 'success', text: 'Password updated.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordMsg(null), 3000)
    },
    onError: () =>
      setPasswordMsg({ type: 'error', text: 'Failed to update password. Check your current password.' }),
  })

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    profileMutation.mutate({ name, avatarUrl: avatarUrl || undefined })
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    passwordMutation.mutate({ currentPassword, newPassword })
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

  return (
    <div className="space-y-8">
      <SectionCard title="Profile">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-orange-600">
                {(user?.name ?? '?')[0].toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold text-zinc-900">{user?.name}</p>
            <p className="text-sm text-zinc-500">{user?.email}</p>
            <span className={`text-xs ${user?.emailVerified ? 'text-green-600' : 'text-zinc-400'}`}>
              {user?.emailVerified ? 'Email verified' : 'Email not verified'}
            </span>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Full name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Avatar URL</label>
            <input
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="https://..."
            />
          </div>
          <FieldMsg msg={profileMsg} />
          <button
            type="submit"
            disabled={profileMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {profileMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Change password">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {[
            { label: 'Current password', value: currentPassword, onChange: setCurrentPassword },
            { label: 'New password', value: newPassword, onChange: setNewPassword },
            { label: 'Confirm new password', value: confirmPassword, onChange: setConfirmPassword },
          ].map(({ label, value, onChange }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
              <input
                type="password"
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          ))}
          <FieldMsg msg={passwordMsg} />
          <button
            type="submit"
            disabled={
              passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword
            }
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {passwordMutation.isPending ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </SectionCard>
    </div>
  )
}
