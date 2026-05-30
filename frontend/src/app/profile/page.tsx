'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgeCheck, ExternalLink } from 'lucide-react';
import AppShell from '@/components/AppShell';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import BetaTag from '@/components/ui/BetaTag';
import { getProfile, saveProfile } from '@/lib/api-client';
import type { Industry, UserProfile } from '@/lib/types';

const INDUSTRIES: Industry[] = [
  'Biotechnology',
  'Clean Energy',
  'Quantum Computing',
  'Robotics',
  'AI/ML',
];

const MAX_BIO = 250;

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({
    fullName: '',
    primaryExpertise: '',
    industry: 'Biotechnology',
    bio: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getProfile()
      .then((p) => setProfile(p))
      .catch(() => {
        /* mock first-load is fine to be empty */
      });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await saveProfile(profile);
      router.push('/upload');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      {/* progress bar */}
      <div className="mb-10">
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted">
          <span>Setup Progress</span>
          <span>65% Complete</span>
        </div>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-border">
          <div className="h-full w-[65%] bg-ink" />
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <BetaTag label="CORE_V1.0" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Establish Your Scientific Identity</h1>
      <p className="mt-2 text-sm text-muted">
        Your profile connects your research to global capital and peer collaboration networks.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <Card>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              id="full-name"
              label="Full Legal Name"
              placeholder="Dr. Elena Volkova"
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
            />
            <Input
              id="expertise"
              label="Primary Expertise"
              placeholder="Neural Network Compression"
              value={profile.primaryExpertise}
              onChange={(e) =>
                setProfile({ ...profile, primaryExpertise: e.target.value })
              }
            />
          </div>

          <div className="mt-5 space-y-2">
            <span className="label">Industry Focus</span>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((it) => (
                <Chip
                  key={it}
                  active={profile.industry === it}
                  onClick={() => setProfile({ ...profile, industry: it })}
                >
                  {it}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <Textarea
              id="bio"
              label="Professional Bio"
              placeholder="Briefly describe your research trajectory or startup's mission..."
              value={profile.bio}
              onChange={(e) =>
                setProfile({ ...profile, bio: e.target.value.slice(0, MAX_BIO) })
              }
              hint="Use high-impact technical keywords for better visibility in venture capital searches."
              rightSlot={
                <span className="text-xs text-muted">
                  {profile.bio.length} / {MAX_BIO}
                </span>
              }
            />
          </div>

          <div className="mt-6 rounded-lg border border-border bg-canvas p-4">
            <div className="flex items-center gap-2">
              <BadgeCheck size={16} className="text-ink" />
              <span className="text-sm font-semibold">Verify Credentials</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Connect your ORCID or LinkedIn to automatically verify your publications and history.
            </p>
            <a
              href="#"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink underline underline-offset-4"
            >
              Link External Authority <ExternalLink size={12} />
            </a>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              className="text-sm text-muted underline-offset-4 hover:underline"
            >
              Save draft for later
            </button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Complete Profile'} <ArrowRight size={14} />
            </Button>
          </div>
        </Card>
      </form>

      <div className="mt-10 grid grid-cols-1 gap-6 text-sm md:grid-cols-3">
        <div>
          <div className="font-semibold">🛡 Privacy First</div>
          <p className="mt-1 text-xs text-muted">
            Your sensitive research data is encrypted and only visible to authorized collaborators.
          </p>
        </div>
        <div>
          <div className="font-semibold">🕸 Network Access</div>
          <p className="mt-1 text-xs text-muted">
            Complete profiles are 12x more likely to be contacted by Tier-1 venture funds.
          </p>
        </div>
        <div>
          <div className="font-semibold">❔ Need Help?</div>
          <p className="mt-1 text-xs text-muted">
            Our concierge team is available to assist with onboarding for university departments.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
