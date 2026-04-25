'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST, UTC+5:30)' },
  { value: 'America/New_York', label: 'US Eastern (EST, UTC-5)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PST, UTC-8)' },
  { value: 'America/Chicago', label: 'US Central (CST, UTC-6)' },
  { value: 'Europe/London', label: 'London (GMT, UTC+0)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET, UTC+1)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST, UTC+4)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST, UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST, UTC+10)' },
  { value: 'UTC', label: 'UTC' },
];

const REGION_LABELS: Record<string, string> = {
  'ap-south-1': 'India (ap-south-1)',
  'us-east-1': 'United States (us-east-1)',
  'eu-central-1': 'Europe (eu-central-1)',
  'me-central-1': 'Middle East (me-central-1)',
};

function IndividualOnboarding() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  function handleComplete() {
    router.push('/dashboard');
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold text-zinc-900 mb-1">Set up your profile</h1>
      <p className="text-zinc-500 text-sm mb-6">Just a few details to get you started.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How should we call you?"
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <div className="border border-zinc-100 rounded-xl p-4 bg-zinc-50">
          <p className="text-sm font-medium text-zinc-700 mb-1">Profile photo</p>
          <p className="text-xs text-zinc-400">You can add a profile photo later from your settings.</p>
        </div>
      </div>

      <button
        onClick={handleComplete}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors mt-6"
      >
        Go to dashboard
      </button>
    </>
  );
}

function EnterpriseOnboarding() {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  function handleComplete() {
    router.push('/dashboard');
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold text-zinc-900 mb-1">Set up your workspace</h1>
      <p className="text-zinc-500 text-sm mb-6">A few optional steps to get your team started.</p>

      <div className="space-y-4">
        <div className="border border-zinc-100 rounded-xl p-4 bg-zinc-50">
          <p className="text-sm font-medium text-zinc-700 mb-1">Organisation logo</p>
          <p className="text-xs text-zinc-400">Upload your org logo from Organisation Settings after setup.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Invite a team member{' '}
            <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@yourcompany.com"
              className="flex-1 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="button"
              disabled={!inviteEmail || inviteSent}
              onClick={() => setInviteSent(true)}
              className="border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold px-4 py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {inviteSent ? 'Sent!' : 'Invite'}
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-1.5">You can invite more people from Team Settings.</p>
        </div>
      </div>

      <button
        onClick={handleComplete}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors mt-6"
      >
        Go to dashboard
      </button>

      <button
        onClick={handleComplete}
        className="w-full text-zinc-400 hover:text-zinc-600 text-sm py-2 mt-2 transition-colors"
      >
        Skip for now
      </button>
    </>
  );
}

function OnboardingContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  return mode === 'enterprise' ? <EnterpriseOnboarding /> : <IndividualOnboarding />;
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 py-12 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-extrabold text-zinc-900">
            Doc<span className="text-orange-500">Panther</span>
          </span>
        </div>
        <Suspense>
          <OnboardingContent />
        </Suspense>
      </div>
    </div>
  );
}
