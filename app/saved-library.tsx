'use client';

import type { Draft } from './source-preview';
import type { SavedPage } from './device-library';

export function Bookmarks({ bookmarks, draft, open, remove, setup }: {
  bookmarks: SavedPage[];
  draft: Draft | null;
  open: (index: number, title: string) => void;
  remove: (page: SavedPage) => void;
  setup: () => void;
}) {
  return <section className="panel content-panel saved-library">
    <h2>Bookmarks</h2>
    <p>Save a source page from the reading screen to find it again on this device.</p>
    {bookmarks.length ? <ul className="result-list">{bookmarks.map(bookmark => {
      const available = draft?.hash === bookmark.hash;
      return <li className="result-card" key={bookmark.hash + ':' + bookmark.index}>
        <h3>{bookmark.title}</h3>
        <p>{bookmark.filename} · PDF page {bookmark.index + 1}</p>
        <div className="pdf-pagination">
          {available
            ? <button className="primary" onClick={() => open(bookmark.index, bookmark.title)}>Open saved page</button>
            : <button className="outline" onClick={setup}>Select the original PDF</button>}
          <button className="outline" aria-label={'Remove bookmark for ' + bookmark.title} onClick={() => remove(bookmark)}>Remove</button>
        </div>
      </li>;
    })}</ul> : <div className="notice">No bookmarks yet. Open any search result and select Bookmark page.</div>}
  </section>;
}

export function OfflineLibrary({ draft, saved, busy, online, save, remove, setup, search }: {
  draft: Draft | null;
  saved: Draft | null;
  busy: boolean;
  online: boolean;
  save: () => void;
  remove: () => void;
  setup: () => void;
  search: () => void;
}) {
  return <section className="panel content-panel saved-library">
    <h2>Offline library</h2>
    <p>Your PDF and index are saved automatically on this device for the next time you open the app.</p>
    {saved && <div className="result-card">
      <h3>{saved.name}</h3>
      <p>Saved on this device · {saved.pages.length} PDF pages · {saved.file ? (saved.file.size / 1048576).toFixed(1) + ' MB PDF' : 'Searchable text and index saved'}</p>
      <div className="pdf-pagination">
        <button className="primary" disabled={busy} onClick={search}>Search saved PDF</button>

      </div>
    </div>}
    {draft && draft.hash !== saved?.hash && <div className="result-card">
      <h3>{draft.name}</h3>
      <p>{draft.file ? (draft.file.size / 1048576).toFixed(1) + ' MB PDF plus searchable text and index.' : 'Searchable text and index.'} {saved && 'This replaces the current offline copy.'}</p>
      <div className="pdf-pagination">
        <button className="primary" disabled={busy || !online} onClick={save}>{busy ? 'Saving…' : 'Download for offline use'}</button>
        {!online && <span>Connect to the internet to download.</span>}
      </div>
    </div>}
    {!draft && !saved && <p>The published PDF loads automatically while online. Your last saved copy will appear here.</p>}
    <p className="offline-footnote">Only this device and browser can access the download. Clearing browser data removes it. AI requires internet.</p>
  </section>;
}
