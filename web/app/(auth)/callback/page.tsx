'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    useAuthStore.getState().setAuth(token, '', null);

    api
      .get('/api/auth/me')
      .then(({ data }) => {
        setAuth(token, '', data);
        router.replace('/dashboard');
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        router.replace('/login');
      });
  }, []);

  return null;
}

export default function CallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 py-12 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 w-full max-w-md text-center">
        <div className="mb-6">
          <span className="text-2xl font-extrabold text-zinc-900">
            Doc<span className="text-orange-500">Panther</span>
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
          <svg
            className="animate-spin h-4 w-4 text-orange-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Signing you in…
        </div>
        <Suspense>
          <CallbackHandler />
        </Suspense>
      </div>
    </div>
  );
}
