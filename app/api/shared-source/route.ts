import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';

export const dynamic = 'force-dynamic';

const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const maxBytes = 50 * 1024 * 1024;
const publicKey = 'public-source/current.pdf';

function status(message: string, code: number) {
  return Response.json({ message }, { status: code, headers: privateHeaders });
}

function sourceKey(userId: string) {
  return 'account-source/' + encodeURIComponent(userId) + '/current.pdf';
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!env.BUCKET) return status('Shared storage is unavailable.', 503);
  const canPublish = !!user && !!env.EDLIZ_PUBLISHER_EMAIL &&
    user.email.toLowerCase() === env.EDLIZ_PUBLISHER_EMAIL.toLowerCase();
  const params = new URL(request.url).searchParams;
  const previous = params.get('previous') === '1';
  if (previous && (!canPublish || !user)) return status('Publisher access required.', 403);

  const key = previous && user ? sourceKey(user.userId) : publicKey;
  if (params.get('meta') === '1') {
    const [item, privateCopy] = await Promise.all([
      env.BUCKET.head(key),
      canPublish && user && !previous ? env.BUCKET.head(sourceKey(user.userId)) : null,
    ]);
    return Response.json({
      hash: item?.customMetadata?.hash ?? null,
      name: item?.customMetadata?.name ?? null,
      canPublish,
      hasPrevious: !!privateCopy,
    }, { headers: privateHeaders });
  }

  const item = await env.BUCKET.get(key);
  if (!item) return status('No PDF is available.', 404);
  return new Response(item.body, {
    headers: {
      ...privateHeaders,
      'Content-Type': 'application/pdf',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'attachment',
      'X-Source-Name': item.customMetadata?.name ?? 'EDLIZ.pdf',
    },
  });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return status('Sign in as the publisher to update the public PDF.', 401);
  if (!env.EDLIZ_PUBLISHER_EMAIL || user.email.toLowerCase() !== env.EDLIZ_PUBLISHER_EMAIL.toLowerCase()) {
    return status('Publisher access required.', 403);
  }
  const origin = request.headers.get('Origin');
  if (origin !== new URL(request.url).origin) return status('Open the app to upload a PDF.', 403);
  if (!env.BUCKET) return status('Shared storage is unavailable.', 503);
  if (request.headers.get('Content-Type') !== 'application/pdf' || !request.body) {
    return status('Select a PDF document.', 415);
  }
  const size = Number(request.headers.get('Content-Length'));
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxBytes) {
    return status('PDFs must be between 1 byte and 50 MB.', 413);
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength !== size || new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') {
    return status('The file does not have a valid PDF header.', 422);
  }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
  const name = (request.headers.get('X-Source-Name') || 'EDLIZ.pdf').slice(0, 800);
  await env.BUCKET.put(publicKey, bytes, { customMetadata: { hash, name } });
  return Response.json({ hash }, { headers: privateHeaders });
}
