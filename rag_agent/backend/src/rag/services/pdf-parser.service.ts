import { Injectable } from '@nestjs/common';

type PdfJsLib = {
  getDocument: (params: {
    data: Uint8Array;
    useSystemFonts?: boolean;
    disableFontFace?: boolean;
  }) => { promise: Promise<PdfDocument> };
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type PdfPage = {
  getTextContent: () => Promise<{ items?: Array<{ str?: unknown }> }>;
};

let cachedPdfjs: PdfJsLib | null = null;
async function getPdfjs(): Promise<PdfJsLib> {
  if (cachedPdfjs) return cachedPdfjs;
  const mod = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown;
  cachedPdfjs = mod as PdfJsLib;
  return cachedPdfjs;
}

@Injectable()
export class PdfParserService {
  async parsePdfToPages(bytes: Buffer): Promise<
    Array<{
      pageNumber: number;
      text: string;
    }>
  > {
    const pdfjsLib = await getPdfjs();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(bytes),
      useSystemFonts: true,
      disableFontFace: true,
    });

    const doc = await loadingTask.promise;
    const pages: Array<{ pageNumber: number; text: string }> = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const strings = (content.items ?? []).flatMap((it) =>
        typeof it.str === 'string' ? [it.str] : [],
      );
      pages.push({
        pageNumber,
        text: strings.join(' '),
      });
    }

    return pages;
  }
}
