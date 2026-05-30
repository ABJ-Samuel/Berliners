'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Upload as UploadIcon, X } from 'lucide-react';
import AppShell from '@/components/AppShell';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { submitPaper } from '@/lib/api-client';

const STARTER_FIELDS = ['Quantum Computing', 'Deep Learning'];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [abstract, setAbstract] = useState('');
  const [fields, setFields] = useState<string[]>(STARTER_FIELDS);
  const [newField, setNewField] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSelectFile = () => fileInputRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) console.log('Selected file:', f.name, f.size);
  };

  const removeField = (f: string) => setFields(fields.filter((x) => x !== f));
  const addField = () => {
    const v = newField.trim();
    if (v && !fields.includes(v)) setFields([...fields, v]);
    setNewField('');
  };

  const onDiscard = () => {
    setFile(null);
    setTitle('');
    setAuthors('');
    setCompletedAt('');
    setAbstract('');
    setFields(STARTER_FIELDS);
  };

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await submitPaper({
        title,
        authors,
        completedAt: completedAt || undefined,
        abstract,
        fields,
        fileName: file?.name,
      });
      router.push('/recommend');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
        Submission Portal
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Upload Research Paper</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Contribute to the collective knowledge. ScholarLab processes your PDF and extracts metadata
        automatically using AI-assisted indexing.
      </p>

      {/* Drop zone */}
      <div className="mt-8 rounded-xl2 border-2 border-dashed border-border bg-white/50 p-12 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-black/5">
          <UploadIcon size={20} className="text-ink" />
        </div>
        <div className="mt-4 text-base font-semibold">
          {file ? file.name : 'Drop your manuscript here'}
        </div>
        <div className="mt-1 text-xs text-muted">
          Support for PDF, LaTeX, and Markdown (Max 50MB)
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.tex,.md"
          className="hidden"
          onChange={onFile}
        />
        <div className="mt-5">
          <Button onClick={handleSelectFile}>
            Select from local storage <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="mt-8">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <FileText size={18} />
            <h2 className="text-lg font-semibold">Manuscript Details</h2>
          </div>

          <Input
            id="paper-title"
            label="Paper Title"
            placeholder="e.g. Neural Architectures for Large Scale Discovery"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              id="authors"
              label="Primary Authors"
              placeholder="Dr. Sarah Jenkins, Mark Vance"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
            />
            <Input
              id="completed-at"
              label="Date of Completion"
              type="date"
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <Textarea
              id="abstract"
              label="Abstract Summary"
              placeholder="Briefly describe the research methodology and key findings..."
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
            />
          </div>

          <div className="mt-4 space-y-2">
            <span className="label">Research Fields &amp; Tags</span>
            <div className="flex flex-wrap items-center gap-2">
              {fields.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 font-mono text-[11px] text-ink"
                >
                  {f}
                  <button
                    type="button"
                    onClick={() => removeField(f)}
                    className="text-muted hover:text-ink"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-white px-2.5 py-1 font-mono text-[11px] text-muted">
                +
                <input
                  value={newField}
                  onChange={(e) => setNewField(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addField();
                    }
                  }}
                  placeholder="Add Field"
                  className="w-24 bg-transparent outline-none placeholder:text-muted"
                />
              </span>
            </div>
          </div>

          <div className="mt-6 h-px bg-border" />

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="mono-tag">Verified Portal</span>
              <span>Indexing speed: ~12s</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onDiscard}>
                Discard
              </Button>
              <Button onClick={onSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Finalize Submission'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        By uploading, you agree to ScholarLab&apos;s{' '}
        <a className="underline underline-offset-4" href="#">Research Integrity Policy</a> and{' '}
        <a className="underline underline-offset-4" href="#">Data Storage Terms</a>.
      </p>
    </AppShell>
  );
}
