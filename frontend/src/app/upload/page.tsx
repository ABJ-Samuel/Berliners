'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, FileText, Upload as UploadIcon, Download, Trash2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import {
  deleteDocument,
  downloadDocument,
  listDocuments,
  uploadDocument,
} from '@/lib/api-client';
import type { ApiDocument } from '@/lib/types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [docs, setDocs] = useState<ApiDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const loadDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      setDocs(await listDocuments());
    } catch {
      /* guard handles auth errors */
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const handleSelectFile = () => fileInputRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await uploadDocument({
        file,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      });
      resetForm();
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    try {
      await deleteDocument(id);
    } catch {
      void loadDocs();
    }
  };

  return (
    <AppShell requireRole="researcher">
      <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted">
        Submission Portal
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Upload Research Document</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Upload your research documents. Companies discover the most relevant work through
        matching — your uploads are the foundation for it.
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
          PDF, Word, PowerPoint, Text, Images, ZIP — max 10 MB
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.json,.zip,.png,.jpg,.jpeg,.gif,.webp"
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
            <h2 className="text-lg font-semibold">Document Details</h2>
          </div>

          <Input
            id="doc-title"
            label="Title (optional)"
            placeholder="e.g. Neural Architectures for Large Scale Discovery"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="mt-4">
            <Textarea
              id="doc-description"
              label="Description (optional)"
              placeholder="Brief description of methodology and key findings …"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 h-px bg-border" />

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={resetForm} disabled={submitting}>
              Clear
            </Button>
            <Button onClick={onSubmit} disabled={submitting || !file}>
              {submitting ? 'Uploading…' : 'Upload document'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Existing documents */}
      <div className="mt-8">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Your documents</h2>
          {loadingDocs ? (
            <p className="py-6 text-center text-sm text-muted">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No documents uploaded yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/5">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {d.title || d.fileName}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted">
                        {d.fileName} · {formatSize(d.size)} ·{' '}
                        {new Date(d.createdAt).toLocaleDateString()}
                      </div>
                      {d.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-ink/70">{d.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => void downloadDocument(d)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted hover:text-ink"
                      aria-label="download"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => void onDelete(d.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted hover:text-red-600"
                      aria-label="delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
