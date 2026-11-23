'use client';

import { useState } from 'react';
import { ArrowRight, BookOpen, Pill, Search } from 'lucide-react';
import type { Draft } from './source-preview';
import { findReference } from './assistant-search';
import { Highlight } from './source-reader';

export default function ReferenceAssistant({ draft, openPage, browse }: {
  draft: Draft | null;
  openPage: (index: number, title?: string) => void;
  browse: (module: string) => void;
}) {
  const [question, setQuestion] = useState('');
  const [submitted, setSubmitted] = useState('');
  const found = draft && submitted ? findReference(draft, submitted) : null;
  const medicineCount = !!submitted && /(?:how many|number of|count|total)/i.test(submitted) && /medicin|drug/i.test(submitted);
  const medicineEntries = draft?.index?.medicines ?? [];
  const distinctMedicines = [...new Set(medicineEntries.map(entry => entry.title.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()))];
  const indexPages = [...new Set(medicineEntries.map(entry => entry.listedOn))];
  const generalMedicine = !!submitted && !found?.terms.length && /medicin|drug/i.test(submitted);

  return <section className="panel reference-assistant">
    <div className="assistant-intro">
      <span className="feature-icon"><BookOpen size={26}/></span>
      <h2>Find information in EDLIZ</h2>
      <p>Search the published document in your own words. Results show source passages and their PDF pages.</p>
    </div>
    <form className="searchbox ai-input" onSubmit={event => {
      event.preventDefault();
      if (draft && question.trim()) setSubmitted(question.trim());
    }}>
      <input aria-label="Ask EDLIZ AI" placeholder="For example, treatment of malaria…" value={question}
        onChange={event => setQuestion(event.target.value)} maxLength={500}/>
      <button aria-label="Send question" disabled={!draft || !question.trim()}><ArrowRight size={20}/></button>
    </form>
    {!draft && <p role="status">The published reference is loading. Your question can be searched once it is ready.</p>}
    <div className="assistant-shortcuts">
      <button className="outline" onClick={() => browse('Medicines')}><Pill size={16}/> Browse medicines</button>
      <button className="outline" onClick={() => browse('Conditions')}><BookOpen size={16}/> Browse conditions</button>
    </div>
    <p className="assistant-method">Document search · Results are extracted source text. AI-generated answers are awaiting provider configuration.</p>
    {submitted && draft && <div className="assistant-results">
      <div className="question">{submitted}</div>
      {medicineCount ? <div className="response" role="status">
        {medicineEntries.length ? <>
          <h3>{distinctMedicines.length} distinct medicine index names</h3>
          <p>I counted {medicineEntries.length} entries in the book’s “Index by medicine name” and removed exact duplicate names, ignoring case and extra spaces. This count includes combination products and separately named preparations listed by the book.</p>
          <p>This is a count of index names. A count of unique active ingredients or all medicines mentioned throughout the text would require a separate reviewed catalogue.</p>
          <div className="pdf-pagination">{indexPages.map(page => <button className="outline" key={page} onClick={() => openPage(page - 1, 'Index by medicine name')}>Source · PDF page {page}</button>)}</div>
          <button className="primary" onClick={() => browse('Medicines')}>Inspect counted entries <ArrowRight size={16}/></button>
        </> : <p>No medicine index is available in the loaded document, so I cannot calculate a supported count.</p>}
      </div> : generalMedicine ? <div className="response">
        <p>{draft.index ? draft.index.medicines.length + ' medicine entries are available in the document index.' : 'Open Medicines to browse the available index.'} Enter a medicine name to find its source passages.</p>
        <button className="primary" onClick={() => browse('Medicines')}>Open medicine library <ArrowRight size={16}/></button>
      </div> : !found?.terms.length ? <p role="status">Add a condition, medicine name, or specific topic to search.</p>
        : found.results.length ? <>
          <p role="status">{found.results.length} source pages found. Open each page to read the full context and tables.</p>
          <ul className="result-list">{found.results.map(result => <li className="result-card" key={result.index}>
            <div className="result-heading"><Search size={18}/><h3>PDF page {result.index + 1}</h3></div>
            {!result.fullMatch && <p>Matches some of your search terms.</p>}
            <blockquote className="assistant-passage"><Highlight text={result.passage} query={found.terms.join(' ')}/></blockquote>
            <button className="result-action" onClick={() => openPage(result.index)}>Read full source page <ArrowRight size={16}/></button>
          </li>)}</ul>
        </> : <div className="response" role="status">
          No matching passage was found in the loaded document. Try the generic medicine name, a condition name, or fewer words.
        </div>}
    </div>}
    <small>Verify clinical details in the original PDF. Keep patient names and identifying information out of questions.</small>
  </section>;
}
