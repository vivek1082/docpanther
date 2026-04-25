'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token found in the link.');
      return;
    }

    api
      .post('/api/auth/verify-email', { token })
      .then(async ({ data }) => {
        useAuthStore.getState().setAuth(data.access_token, data.refresh_token, null);
        const { data: user } = await api.get('/api/auth/me');
        setAuth(data.access_token, data.refresh_token, user);
        setStatus('success');
        setTimeout(() => router.push('/onboarding?mode=individual'), 1500);
      })
      .catch((err: unknown) => {
        const apiErr = err as { response?: { data?: { message?: string } } };
        setStatus('error');
        setErrorMsg(apiErr.response?.data?.message ?? 'Verification failed. The link may have expired.');
      });
  }, [searchParams, router, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 py-12 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 w-full max-w-md text-center">
        <div className="mb-6">
          <span className="text-2xl font-extrabold text-zinc-900">
            Doc<span className="text-orange-500">Panther</span>
          </span>
        </div>

        {status === 'verifying' && (
          <>
            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-extrabold text-zinc-900 mb-2">Verifying your email…</h1>
            <p className="text-zinc-500 text-sm">This will only take a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-extrabold text-zinc-900 mb-2">Email verified!</h1>
            <p className="text-zinc-500 text-sm">Redirecting you to setup your account…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-extrabold text-zinc-900 mb-2">Verification failed</h1>
            <p className="text-zinc-500 text-sm mb-6">{errorMsg}</p>
            <Link href="/register" className="text-orange-500 hover:text-orange-600 font-medium text-sm">
              Back to sign up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
