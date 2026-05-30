'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FlaskConical, Building2, Check } from 'lucide-react';
import AppShell from '@/components/AppShell';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import BetaTag from '@/components/ui/BetaTag';
import { useAuth } from '@/lib/auth-context';
import { updateMe } from '@/lib/api-client';
import { landingPath } from '@/lib/routing';
import type { Role } from '@/lib/types';

const MAX_BIO = 1000;

const ROLE_CARDS: { role: Role; title: string; desc: string; icon: typeof FlaskConical }[] = [
  {
    role: 'researcher',
    title: 'Researcher',
    desc: 'I publish research and upload documents so companies can discover them.',
    icon: FlaskConical,
  },
  {
    role: 'company',
    title: 'Company',
    desc: 'I look for relevant research papers for my company’s projects and problems.',
    icon: Building2,
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  const [role, setRole] = useState<Role>('researcher');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the form from the current user once it's available.
  useEffect(() => {
    if (!user) return;
    setRole(user.type);
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setDescription(user.description);
  }, [user]);

  const isOnboarding = user ? !user.onboarded : false;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateMe({
        type: role,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        description,
        onboarded: true,
      });
      setUser(updated);
      router.push(landingPath(updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-center gap-3">
        <BetaTag label="CORE_V1.0" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">
        {isOnboarding ? 'Welcome — set up your profile' : 'Your profile'}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Choose your role and complete your profile. You can change this anytime.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        {/* Role selection */}
        <div>
          <span className="label">I am a …</span>
          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            {ROLE_CARDS.map(({ role: r, title, desc, icon: Icon }) => {
              const active = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`relative rounded-xl2 border p-5 text-left transition-colors ${
                    active
                      ? 'border-ink bg-white shadow-card'
                      : 'border-border bg-white/50 hover:border-ink/40'
                  }`}
                >
                  {active && (
                    <span className="absolute right-4 top-4 grid h-5 w-5 place-items-center rounded-full bg-ink text-white">
                      <Check size={12} />
                    </span>
                  )}
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-black/5">
                    <Icon size={18} className="text-ink" />
                  </div>
                  <div className="mt-3 text-base font-semibold">{title}</div>
                  <p className="mt-1 text-xs text-muted">{desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <Card>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              id="first-name"
              label="First name"
              placeholder="Elena"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              id="last-name"
              label="Last name"
              placeholder="Volkova"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="mt-5">
            <Textarea
              id="description"
              label={role === 'company' ? 'About your company' : 'About your research'}
              placeholder={
                role === 'company'
                  ? 'What are you building, and which problems do you want research to solve?'
                  : 'Briefly describe your research focus …'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_BIO))}
              rightSlot={
                <span className="text-xs text-muted">
                  {description.length} / {MAX_BIO}
                </span>
              }
            />
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-8 flex items-center justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : isOnboarding ? 'Continue' : 'Save changes'}{' '}
              <ArrowRight size={14} />
            </Button>
          </div>
        </Card>
      </form>
    </AppShell>
  );
}
