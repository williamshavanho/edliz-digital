import type { Draft } from './source-preview';

export type SavedPage = { hash: string; index: number; title: string; filename: string };

export function offlineDraft(): Promise<Draft | undefined>;
export function offlineDraft(value: Draft | null): Promise<void>;
export function offlineDraft(value?: Draft | null): Promise<Draft | undefined | void> {
  return storedDraft('pdf', value);
}

export function publishedDraft(): Promise<Draft | undefined>;
export function publishedDraft(value: Draft): Promise<void>;
export function publishedDraft(value?: Draft): Promise<Draft | undefined | void> {
  return storedDraft('published-pdf-v1', value);
}

export function activeDraft(): Promise<Draft | undefined>;
export function activeDraft(value: Draft): Promise<void>;
export function activeDraft(value?: Draft): Promise<Draft | undefined | void> {
  return storedDraft('active-pdf-v1', value);
}

export function usableDraft(value: Draft | undefined): value is Draft {
  return !!value && typeof value.hash === 'string' && (value.file === null || value.file instanceof Blob) &&
    Array.isArray(value.pages) && value.pages.length > 0;
}

function storedDraft(key: string, value?: Draft | null): Promise<Draft | undefined | void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('edliz-device-library', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('documents');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      try {
        const transaction = database.transaction('documents', value === undefined ? 'readonly' : 'readwrite');
        const store = transaction.objectStore('documents');
        const operation = value === undefined ? store.get(key) :
          value === null ? store.delete(key) : store.put(value, key);
        transaction.oncomplete = () => { database.close(); resolve(operation.result); };
        transaction.onabort = () => { database.close(); reject(transaction.error); };
      } catch (error) {
        database.close();
        reject(error);
      }
    };
  });
}

export async function cacheAppShell() {
  if (!navigator.serviceWorker) throw new Error('Offline mode is unavailable');
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) throw new Error('The offline worker has not started');
  const assetUrls = performance.getEntriesByType('resource').map(entry => entry.name);
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error('The offline app did not finish downloading'));
    }, 15000);
    channel.port1.onmessage = event => {
      clearTimeout(timer);
      channel.port1.close();
      if (event.data === 'ready') resolve();
      else reject(new Error('The offline app could not be cached'));
    };
    worker.postMessage({ type: 'cache-shell', assetUrls }, [channel.port2]);
  });
}
