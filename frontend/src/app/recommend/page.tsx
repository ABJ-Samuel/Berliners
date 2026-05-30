'use client';

import { useState } from 'react';
import { ArrowRight, FileText, Moon, Search } from 'lucide-react';
import AppShell from '@/components/AppShell';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import BetaTag from '@/components/ui/BetaTag';
import { recommend } from '@/lib/api-client';
import type { RecommendIndustry, RecommendedPaper } from '@/lib/types';

const INDUSTRIES: RecommendIndustry[] = [
  'AI / Machine Learning',
  'FinTech',
  'Web3 / Blockchain',
  'Healthcare / Biotech',
  'Cybersecurity',
  'E-commerce / Retail',
  'Manufacturing / Industrial',
];

const EXAMPLES = ['Stripe', 'Chainalysis', 'Tempus AI'] as const;

export default function RecommendPage() {
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState<RecommendIndustry | undefined>();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecommendedPaper[] | null>(null);

  const canSubmit = company.trim() && description.trim() && !loading;

  const onRecommend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await recommend({ company, description, industry });
      setResults(res.results);
    } finally {
      setLoading(false);
    }
  };

  const prefill = (name: string) => {
    setCompany(name);
    if (!description) {
      setDescription(
        `We're building products for ${name}'s domain and want the most relevant research.`,
      );
    }
  };

  return (
    <AppShell requireRole="company">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-black/5">
            <FileText size={18} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Paper Match</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Tell us your company and project — get the most relevant research papers,
              automatically.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-white text-muted hover:text-ink">
            <Moon size={14} />
          </button>
          <BetaTag label="BETA" />
        </div>
      </div>

      <form onSubmit={onRecommend} className="mt-8">
        <Card>
          <Input
            id="company"
            label="Company name *"
            placeholder="e.g. Stripe, Chainalysis, TSMC"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />

          <div className="mt-5">
            <Textarea
              id="description"
              label="Project description * — what are you building or researching?"
              placeholder="e.g. We're building a real-time payments platform and need to reduce card fraud while staying compliant across regions."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="mt-5 space-y-2">
            <span className="text-sm text-muted">
              Industry — <span className="italic">optional, picking one sharpens results</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((it) => (
                <Chip
                  key={it}
                  active={industry === it}
                  onClick={() => setIndustry(industry === it ? undefined : it)}
                >
                  {it}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button type="submit" disabled={!canSubmit}>
              {loading ? 'Recommending…' : 'Recommend'} <ArrowRight size={14} />
            </Button>
            <span className="text-xs text-muted">Try:</span>
            <div className="flex gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => prefill(ex)}
                  className="rounded-md border border-border bg-canvas px-2 py-1 font-mono text-[11px] text-ink hover:border-ink/40"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </form>

      <section className="mt-6">
        <Card>
          {loading && (
            <div className="py-16 text-center text-sm text-muted">Searching the corpus…</div>
          )}

          {!loading && !results && (
            <div className="py-16 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-black/5">
                <Search size={20} className="text-ink" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No recommendations yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                Enter your company name and a short project description, optionally pick an
                industry, then hit Recommend — the engine ranks the most relevant.
              </p>
              <div className="mx-auto mt-6 h-px w-1/3 bg-border" />
            </div>
          )}

          {!loading && results && results.length > 0 && (
            <ul className="divide-y divide-border">
              {results.map((p) => (
                <li key={p.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold leading-snug">{p.title}</h3>
                      <p className="mt-0.5 text-xs text-muted">{p.authors.join(', ')}</p>
                      <p className="mt-2 text-sm text-ink/80">{p.snippet}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.fields.map((f) => (
                          <span
                            key={f}
                            className="rounded-full border border-border bg-white px-2 py-0.5 font-mono text-[10px] text-muted"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-xs text-muted">RELEVANCE</div>
                      <div className="text-2xl font-semibold tabular-nums">
                        {Math.round(p.relevance * 100)}%
                      </div>
                      <button className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink underline underline-offset-4">
                        Open <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loading && results && results.length === 0 && (
            <div className="py-16 text-center text-sm text-muted">
              No matches found. Try rewording or removing the industry filter.
            </div>
          )}
        </Card>
      </section>

      <footer className="mt-10 flex items-center justify-between text-xs text-muted">
        <span>© 2024 ScholarLab Research Systems</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-ink">Documentation</a>
          <a href="#" className="hover:text-ink">API</a>
        </div>
      </footer>
    </AppShell>
  );
}
