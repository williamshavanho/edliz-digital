'use client';

import { useEffect, useState } from 'react';
import { FileText, Upload } from 'lucide-react';

import { buildIndex, decodePage, supportedSource } from './edliz-index';

const maxBytes = 50 * 1024 * 1024;

export type Draft = { name: string; hash: string; pages: string[]; file: File | null; index: ReturnType<typeof buildIndex> | null };

export async function extractPdf(file: File, setProgress = (_message: string) => {}): Promise<Draft> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: bytes });
  try {
    const pdf = await task.promise;
    const pages: string[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      setProgress(`Reading PDF page ${number} of ${pdf.numPages}…`);
      const sourcePage = await pdf.getPage(number);
      const content = await sourcePage.getTextContent();
      const textItems = content.items.filter(item => 'str' in item);
      pages.push(hash === supportedSource ? decodePage(textItems) :
        textItems.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('').trim());
      sourcePage.cleanup();
    }
    return { name: file.name, hash, pages, file, index: hash === supportedSource ? buildIndex(pages) : null };
  } finally {
    await task.destroy().catch(() => {});
  }
}

export default function SourcePreview({ draft, setDraft, page, setPage, searchDraft }: {
  draft: Draft | null;
  setDraft: (draft: Draft | null) => void;
  page: number;
  setPage: (page: number) => void;
  searchDraft: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const file = draft?.file;
  const [originalURL, setOriginalURL] = useState('');
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setOriginalURL(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function preview(file: File) {
    setError('');
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setError('Select a PDF document.');
      return;
    }
    if (file.size > maxBytes) {
      setError('This PDF exceeds 50 MB. Select a smaller copy to preview.');
      return;
    }

    setBusy(true);
    setProgress('Opening PDF…');
    try {
      const result = await extractPdf(file, setProgress);
      setPage(0);
      setDraft(result);
    } catch (cause) {
      const name = cause instanceof Error ? cause.name : '';
      setError(name === 'PasswordException'
        ? 'This PDF is password protected. Select an unlocked copy.'
        : 'The PDF could not be read. Check that it opens in a PDF reader, then try again while online.');
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  const pagesWithText = draft?.pages.filter(Boolean).length ?? 0;

  return <>
    <label className="upload">
      <Upload size={32} />
      <span><b>Select your authorised EDLIZ 2025 PDF</b></span>
      <p>PDF up to 50 MB. Select a PDF to preview its contents before publishing.</p>
      <input type="file" accept=".pdf,application/pdf" disabled={busy} onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (file) void preview(file);
      }} />
    </label>
    {progress && <p className="pdf-feedback" role="status">{progress}</p>}
    {error && <p className="pdf-feedback" role="alert">{error}</p>}
    {draft && <section className="file-result" aria-label="PDF extraction preview">
      <FileText size={20} />
      <div className="pdf-result">
        <b>{draft.name}</b>
        <p role="status">{draft.pages.length} PDF pages · Text found on {pagesWithText} pages</p>
        {draft.index
          ? <p>{draft.index.conditions.length} conditions and topics · {draft.index.medicines.length} medicine index entries. Open Conditions or Medicines to browse them.</p>
          : <p>This PDF can be searched as text. Automatic library indexing is available for the supported EDLIZ 2025 circulation PDF.</p>}
        <p>Draft extraction for review. Compare the text, tables, and units against the original PDF.</p>
        {pagesWithText < draft.pages.length && <p>Some pages have no extractable text. Scanned pages need OCR before their text can be reviewed.</p>}
        <div className="pdf-pagination">
          {pagesWithText > 0 && <button className="primary" onClick={searchDraft}>Search this PDF</button>}
        </div>
        <div className="pdf-pagination">
          <button className="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
          <label>PDF page <select value={page} onChange={event => setPage(Number(event.target.value))}>
            {draft.pages.map((_, index) => <option key={index} value={index}>{index + 1}</option>)}
          </select> of {draft.pages.length}</label>
          <button className="outline" disabled={page + 1 >= draft.pages.length} onClick={() => setPage(page + 1)}>Next</button>
        </div>
        {originalURL && <a className="outline" href={originalURL + '#page=' + (page + 1)} target="_blank" rel="noreferrer">Open original PDF page {page + 1}</a>}
        <pre tabIndex={0} aria-label="Extracted page text">{draft.pages[page] || 'No extractable text on this page.'}</pre>
        <details><summary>SHA-256 checksum</summary><code>{draft.hash}</code></details>
      </div>
    </section>}
  </>;
}
