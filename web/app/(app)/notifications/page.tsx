'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../../lib/api'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

interface NotificationsPage {
  content: Notification[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function BellIcon() {
  return (
    <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  )
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery<NotificationsPage>({
    queryKey: ['notifications', page],
    queryFn: () => api.get('/api/notifications', { params: { page } }).then(r => r.data),
  })

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) =>
      api.post('/api/notifications/read', { ids }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadIds = data?.content.filter(n => !n.read).map(n => n.id) ?? []

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-zinc-900">Notifications</h1>
          {unreadIds.length > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadIds.length}
            </span>
          )}
        </div>
        {unreadIds.length > 0 && (
          <button
            onClick={() => markReadMutation.mutate(unreadIds)}
            disabled={markReadMutation.isPending}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {!data?.content.length ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <BellIcon />
          </div>
          <p className="text-zinc-500 font-medium">No notifications yet</p>
          <p className="text-sm text-zinc-400 mt-1">
            You&apos;ll see updates from your cases and team here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.content.map(n => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 transition-colors ${
                n.read
                  ? 'bg-zinc-50 border-zinc-100'
                  : 'bg-white border-zinc-200 border-l-4 border-l-orange-500'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-semibold text-sm ${n.read ? 'text-zinc-600' : 'text-zinc-900'}`}
                  >
                    {n.title}
                  </p>
                  <p className={`text-sm mt-0.5 ${n.read ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {n.body}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markReadMutation.mutate([n.id])}
                    disabled={markReadMutation.isPending}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium shrink-0 disabled:opacity-50"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(data?.totalPages ?? 0) > 1 && (
        <div className="flex justify-center items-center gap-3 mt-8">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-sm border border-zinc-200 rounded-xl text-zinc-700 hover:border-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            {page + 1} / {data?.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min((data?.totalPages ?? 1) - 1, p + 1))}
            disabled={page >= (data?.totalPages ?? 1) - 1}
            className="px-4 py-2 text-sm border border-zinc-200 rounded-xl text-zinc-700 hover:border-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
