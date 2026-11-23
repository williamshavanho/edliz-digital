'use client';

import { useEffect, useRef, useState } from 'react';
import { extractPdf, type Draft } from './source-preview';
import { publishedDraft, activeDraft, usableDraft } from './device-library';

type SyncStatus = 'checking' | 'ready' | 'downloading' | 'uploading' | 'synced' | 'error';
const endpoint = '/api/shared-source';

async function boundedFetch(url: string, timeout: number, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    // Consume the body inside the timeout, including stalled network transfers.
    const bytes = await response.arrayBuffer();
    return new Response(bytes, { status: response.status, headers: response.headers });
  } finally {
    window.clearTimeout(timer);
  }
}

export function useSharedSource(draft: Draft | null, accept: (source: Draft) => void, canReplace: boolean) {
  const [progress, setProgress] = useState('');
  const [status, setStatus] = useState<SyncStatus>('checking');
  const [canPublish, setCanPublish] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [cloudHash, setCloudHash] = useState<string | null>(null);
  const latest = useRef({ draft, accept, canReplace });
  latest.current = { draft, accept, canReplace };
  const working = useRef(false);
  const mounted = useRef(true);

  async function pull(force = false) {
    if (!navigator.onLine || working.current) return;
    working.current = true;
    try {
      const result = await boundedFetch(endpoint + '?meta=1', 20000, { cache: 'no-store' });
      if (!result.ok) throw new Error('Could not check published PDF');
      const meta: { hash: string | null; canPublish: boolean; hasPrevious: boolean } = await result.json();
      setCanPublish(meta.canPublish);
      setHasPrevious(meta.hasPrevious);
      setCloudHash(meta.hash);
      const current = latest.current.draft;
      if (!meta.hash || current?.hash === meta.hash || (!force && !latest.current.canReplace)) {
        setStatus(meta.hash && current?.hash === meta.hash ? 'synced' : 'ready');
        return;
      }
      setStatus('downloading');
      const cached = await publishedDraft().catch(() => undefined);
      let source = usableDraft(cached) && cached.hash === meta.hash ? cached : undefined;
      if (!source) {
        setProgress('Loading searchable reference…');
        const indexed = await boundedFetch('/api/reference-index?hash=' + encodeURIComponent(meta.hash), 25000);
        if (indexed.ok) {
          const prepared = await indexed.json() as Omit<Draft, 'file'>;
          if (prepared.hash !== meta.hash || !Array.isArray(prepared.pages) ||
              !prepared.pages.length || !prepared.pages.every(page => typeof page === 'string')) {
            throw new Error('Reference index is invalid');
          }
          source = { ...prepared, file: null };
        } else if (indexed.status === 404) {
          setProgress('Downloading PDF for indexing…');
          const response = await boundedFetch(endpoint, 45000, { cache: 'no-store' });
          if (!response.ok) throw new Error('Could not download published PDF');
          let name = 'EDLIZ.pdf';
          try { name = decodeURIComponent(response.headers.get('X-Source-Name') || name); } catch {}
          source = await extractPdf(new File([await response.blob()], name, { type: 'application/pdf' }), setProgress);
          if (source.hash !== meta.hash) throw new Error('Source changed during download');
        } else {
          throw new Error('Reference index could not load');
        }
        void publishedDraft(source).catch(() => {});
      }
      if (force || (current === latest.current.draft && latest.current.canReplace)) {
        latest.current.accept(source);
        void activeDraft(source).catch(() => {});
        setStatus('synced');
      } else setStatus('ready');
    } catch {
      if (mounted.current) setStatus(latest.current.draft ? 'ready' : 'error');
    } finally {
      working.current = false;
      setProgress('');
    }
  }

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    async function restore() {
      const [active, published] = await Promise.all([
        activeDraft().catch(() => undefined),
        publishedDraft().catch(() => undefined),
      ]);
      const source = usableDraft(active) ? active : usableDraft(published) ? published : undefined;
      if (!cancelled && source && !latest.current.draft) {
        latest.current.accept(source);
        void activeDraft(source).catch(() => {});
        setStatus('ready');
      }
      if (!cancelled) void pull();
    }
    void restore();
    const check = () => { void pull(); };
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    const interval = window.setInterval(check, 60000);
    return () => {
      cancelled = true;
      mounted.current = false;
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      window.clearInterval(interval);
    };
  }, []);

  async function upload(source: Draft) {
    if (!navigator.onLine || working.current || !source.file) return;
    working.current = true;
    setStatus('uploading');
    try {
      const result = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf', 'X-Source-Name': encodeURIComponent(source.name) },
        body: source.file,
      });
      if (!result.ok) throw new Error('Could not publish PDF');
      const metadata: { hash: string } = await result.json();
      if (metadata.hash !== source.hash) throw new Error('Published checksum does not match');
      void publishedDraft(source).catch(() => {});
      setCloudHash(metadata.hash);
      setStatus('synced');
    } catch {
      if (mounted.current) setStatus(latest.current.draft ? 'ready' : 'error');
    } finally {
      working.current = false;
    }
  }

  async function loadPrevious() {
    if (working.current || !canPublish) return;
    working.current = true;
    setStatus('downloading');
    try {
      const response = await fetch(endpoint + '?previous=1', { cache: 'no-store' });
      if (!response.ok) throw new Error('Previous upload could not be loaded');
      const name = decodeURIComponent(response.headers.get('X-Source-Name') ?? 'EDLIZ.pdf');
      const source = await extractPdf(new File([await response.blob()], name, { type: 'application/pdf' }));
      latest.current.accept(source);
      setStatus('ready');
    } catch {
      if (mounted.current) setStatus(latest.current.draft ? 'ready' : 'error');
    } finally {
      working.current = false;
    }
  }

  return { status, progress, canPublish, hasPrevious, cloudHash, upload, pull, loadPrevious };
}
