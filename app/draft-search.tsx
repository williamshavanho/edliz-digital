'use client';

import type { Draft } from './source-preview';
import { Highlight } from './source-reader';
import { ArrowRight, FileText } from 'lucide-react';

export function normalizeSearch(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/\u00ad/g, '').replace(/\s+/g, ' ').trim();
}

export default function DraftSearch({ draft, query, openPage }: {
  draft: Draft;
  query: string;
  openPage: (index: number, title?: string) => void;
}) {
  const terms = [...new Set(normalizeSearch(query).split(' ').filter(Boolean))];
  const results = terms.length ? draft.pages.flatMap((text, index) => {
    const readable = text.normalize('NFKC').replace(/\u00ad/g, '').replace(/\s+/g, ' ').trim();
    const normalized = readable.toLowerCase();
    if (!terms.every(term => normalized.includes(term))) return [];
    const firstMatch = normalized.indexOf(terms[0]);
    const start = Math.max(0, firstMatch - 65);
    const end = Math.min(readable.length, firstMatch + terms[0].length + 130);
    return [{ index, snippet: (start ? '…' : '') + readable.slice(start, end) + (end < readable.length ? '…' : '') }];
  }) : [];

  return <section className="draft-search" aria-label="PDF search results">
    <div className="notice">
      <div>
        <b>Search in selected PDF · Draft source text</b>
        <p>{draft.name} · Verify passages against the original PDF before clinical use.</p>
      </div>
    </div>
    <p role="status">{!terms.length
      ? 'Enter words from the document to search its extracted text.'
      : results.length
        ? `${results.length} matching PDF ${results.length === 1 ? 'page' : 'pages'}`
        : 'No pages contain all of those words. Try fewer words or different spelling.'}</p>
    {results.length > 0 && <ul className="result-list">
      {results.map(result => <li className="result-card" key={result.index}>
        <div className="result-heading"><FileText size={19} aria-hidden="true"/><h3>PDF page {result.index + 1}</h3></div>
        <p><Highlight text={result.snippet} query={query}/></p>
        <button className="result-action" onClick={() => openPage(result.index)}>Read passage <ArrowRight size={16}/></button>
      </li>)}
    </ul>}
    {draft.pages.some(page => !page) && <p>Pages without extractable text are excluded. Scanned pages require OCR.</p>}
  </section>;
}
