'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from './_lib/hooks';

export default function EducationHome() {
  const role = useRole();
  const router = useRouter();

  useEffect(() => {
    if (role === 'STUDENT') {
      router.replace('/education/my');
    } else if (role === 'TENANT_ADMIN' || role === 'TEACHER') {
      router.replace('/education/batches');
    }
    // role === null means individual account — fall through to empty state below
  }, [role, router]);

  // Still resolving role (user object not loaded yet)
  if (role === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Individual user — education is an enterprise feature
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-8">
      <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      </div>
      <h2 className="text-xl font-extrabold text-zinc-900 mb-2">Education Portal</h2>
      <p className="text-zinc-500 text-sm max-w-sm mb-6">
        The education module is available for organisation accounts. Create or join an organisation to manage batches, subjects, and materials.
      </p>
      <Link
        href="/settings"
        className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
      >
        Go to Settings
      </Link>
    </div>
  );
}
