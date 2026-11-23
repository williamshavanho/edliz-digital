'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Draft } from './source-preview';

export function Highlight({ text, query }: { text: string; query: string }) {
  const terms = [...new Set(query.trim().split(/\s+/).filter(Boolean))]
    .sort((a, b) => b.length - a.length);
  if (!terms.length) return <>{text}</>;
  const escaped = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp('(' + escaped.join('|') + ')', 'giu'));
  return <>{parts.map((part, index) =>
    index % 2 ? <mark key={index}>{part}</mark> : part)}</>;
}

export default function SourceReader({ draft, index, title, query, onBack, onPage, bookmarked, onBookmark }: {
  draft: Draft;
  index: number;
  title: string;
  query: string;
  onBack: () => void;
  onPage: (index: number) => void;
  bookmarked: boolean;
  onBookmark: () => void;
}) {
  const [originalUrl, setOriginalUrl] = useState('');
  useEffect(() => {
    if (!draft.file) {
      setOriginalUrl('/api/shared-source');
      return;
    }
    const url = URL.createObjectURL(draft.file);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.file]);

  const lines = draft.pages[index]?.split('\n').filter(Boolean) ?? [];

  return <section className="source-reader" aria-label="Source reader">
    <div className="reader-toolbar">
      <button className="outline" onClick={onBack}><ArrowLeft size={17}/> Back to results</button>
      <button className="outline" aria-pressed={bookmarked} onClick={onBookmark}><Bookmark size={17} fill={bookmarked ? "currentColor" : "none"}/> {bookmarked ? "Bookmarked" : "Bookmark page"}</button>
      {originalUrl && <a className="outline" href={originalUrl + '#page=' + (index + 1)}
        target="_blank" rel="noreferrer">Original PDF <ArrowUpRight size={16}/></a>}
    </div>
    <div className="reader-banner">
      <span className="reader-emblem"><BookOpen size={24} aria-hidden="true"/></span>
      <div>
        <p className="reader-label">PDF page {index + 1} of {draft.pages.length}</p>
        <h2>{title || 'Document passage'}</h2>
        <p>{draft.name}</p>
      </div>
    </div>
    <div className="reader-content">
      <aside className="reader-source-note">
        <b>Extracted source text</b>
        <p>Compare doses, units, tables, and figures with the original PDF before clinical use.</p>
      </aside>
      <article className="reader-paper" aria-label={'Extracted text from PDF page ' + (index + 1)}>
        {lines.length ? lines.map((line, number) =>
          <div key={number} className={line.includes('   ') ? 'reader-structured-line' : undefined}>
            <Highlight text={line} query={query}/>
          </div>) : <p>No extractable text on this page. Open the original PDF to view it.</p>}
      </article>
    </div>
    <nav className="reader-pagination" aria-label="Document pages">
      <button className="outline" disabled={index === 0} onClick={() => onPage(index - 1)}>
        <ChevronLeft size={17}/> Previous page
      </button>
      <span>Page {index + 1} of {draft.pages.length}</span>
      <button className="outline" disabled={index + 1 >= draft.pages.length} onClick={() => onPage(index + 1)}>
        Next page <ChevronRight size={17}/>
      </button>
    </nav>
  </section>;
}
