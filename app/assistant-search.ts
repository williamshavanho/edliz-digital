import { normalizeSearch } from './draft-search';
import type { Draft } from './source-preview';

const ignored = new Set('a an the of in on at for to and or is are was were do does can could should would i me my you your please tell show check find search about information treatment management what which how when with from medicines medicine conditions condition drugs drug'.split(' '));

export function findReference(draft: Draft, question: string) {
  const terms = [...new Set(normalizeSearch(question).match(/[\p{L}\p{N}]+/gu) ?? [])]
    .filter(term => term.length > 1 && !ignored.has(term));
  if (!terms.length) return { terms, results: [] };
  const results = draft.pages.flatMap((text, index) => {
    const normalized = normalizeSearch(text);
    const matching = terms.filter(term => normalized.includes(term));
    if (!matching.length) return [];
    const fullMatch = matching.length === terms.length;
    const coverage = matching.length / terms.length;
    if (coverage < .6) return [];
    const entries = [...(draft.index?.conditions ?? []), ...(draft.index?.medicines ?? [])];
    const indexedTopic = entries.some(entry => entry.pages.includes(index + 1) &&
      terms.every(term => normalizeSearch(entry.title).includes(term)));
    const score = coverage + (indexedTopic ? 2 : 0) +
      Math.min(20, terms.reduce((count, term) => count + normalized.split(term).length - 1, 0)) / 100;
    const lines = text.split('\n').filter(Boolean);
    const line = lines.findIndex(line => terms.some(term => normalizeSearch(line).includes(term)));
    // Preserve complete source lines and units. Never construct a treatment answer.
    const passage = lines.slice(Math.max(0, line - 1), Math.max(0, line - 1) + 8).join('\n');
    const heading = lines.find(line => {
      const cleaned = normalizeSearch(line);
      return cleaned !== 'edliz 2025' && cleaned.length > 3;
    }) ?? 'Source passage';
    return [{ index, passage, heading, score, fullMatch }];
  }).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 8);
  return { terms, results };
}
