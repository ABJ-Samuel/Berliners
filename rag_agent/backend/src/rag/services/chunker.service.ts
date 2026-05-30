import { Injectable } from '@nestjs/common';
import { EnvService } from '../../config/env.service';

export type Chunk = {
  content: string;
  pageNumber?: number;
  chunkIndex: number;
};

function approxTokenCount(text: string): number {
  // Heuristic: English-ish text averages ~0.75 words/token.
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words / 0.75);
}

@Injectable()
export class ChunkerService {
  private readonly targetTokens: number;
  private readonly overlapTokens: number;

  constructor(private readonly env: EnvService) {
    this.targetTokens = this.env.env.CHUNK_TARGET_TOKENS;
    this.overlapTokens = this.env.env.CHUNK_OVERLAP_TOKENS;
  }

  chunkPages(pages: Array<{ pageNumber: number; text: string }>): Chunk[] {
    const chunks: Chunk[] = [];
    let chunkIndex = 0;

    for (const page of pages) {
      const normalized = this.normalize(page.text);
      if (!normalized) continue;

      const pageChunks = this.chunkText(normalized);
      for (const c of pageChunks) {
        chunks.push({
          content: c,
          pageNumber: page.pageNumber,
          chunkIndex,
        });
        chunkIndex += 1;
      }
    }

    return chunks;
  }

  private chunkText(text: string): string[] {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const result: string[] = [];
    let current: string[] = [];
    let currentTokens = 0;

    const flush = () => {
      if (!current.length) return;
      const chunk = current.join(' ').trim();
      if (chunk) result.push(chunk);

      // Overlap by keeping trailing sentences until overlapTokens reached.
      if (!this.overlapTokens) {
        current = [];
        currentTokens = 0;
        return;
      }

      const keep: string[] = [];
      let keepTokens = 0;
      for (let i = current.length - 1; i >= 0; i -= 1) {
        const s = current[i];
        keep.unshift(s);
        keepTokens += approxTokenCount(s);
        if (keepTokens >= this.overlapTokens) break;
      }
      current = keep;
      currentTokens = keepTokens;
    };

    for (const s of sentences) {
      const sTokens = approxTokenCount(s);
      if (currentTokens + sTokens > this.targetTokens && current.length) {
        flush();
      }
      current.push(s);
      currentTokens += sTokens;
    }
    flush();

    return result;
  }

  private normalize(text: string): string {
    return text
      .split('\u0000')
      .join('')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
}
