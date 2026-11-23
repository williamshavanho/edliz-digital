'use client';

import type { IndexEntry } from './edliz-index';
import { normalizeSearch } from './draft-search';
import { BookOpen, Pill, ArrowRight } from 'lucide-react';
import { Highlight } from './source-reader';

export default function SourceIndex({ entries, query, module, openPage }: {
  entries: IndexEntry[];
  query: string;
  module: 'Conditions' | 'Medicines';
  openPage: (index: number, title?: string) => void;
}) {
  const terms = normalizeSearch(query).split(' ').filter(Boolean);
  const matches = entries.filter(entry => terms.every(term => normalizeSearch(entry.title).includes(term)));
  return <section className="draft-search">
    <div className="notice"><div>
      <b>Draft document index · EDLIZ 2025</b>
      <p>{module === 'Medicines' ? 'Medicine names and references from the book’s medicine index.' : 'Conditions and topics from the chapter contents.'} Open the original PDF to verify information.</p>
    </div></div>
    <p role="status">{matches.length} matching {module === 'Medicines' ? 'medicine entries' : 'conditions and topics'}{matches.length > 100 ? ' · Showing the first 100. Search to narrow the list.' : ''}</p>
    <ul className="result-list">{matches.slice(0, 100).map((entry, index) => <li className="result-card" key={index}>
      <div className="result-heading">
        {module === 'Medicines' ? <Pill size={19} aria-hidden="true"/> : <BookOpen size={19} aria-hidden="true"/>}
        <h3><Highlight text={entry.title} query={query}/></h3>
      </div>
      <div className="pdf-pagination">
        {entry.pages.map(page => <button key={page} className="outline" onClick={() => openPage(page - 1, entry.title)}>PDF page {page}</button>)}
      </div>
      <button className="result-action" onClick={() => openPage(entry.listedOn - 1, entry.title)}>View index source · PDF page {entry.listedOn} <ArrowRight size={16}/></button>
    </li>)}</ul>
  </section>;
}
