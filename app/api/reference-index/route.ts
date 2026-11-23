import { env } from 'cloudflare:workers';
import { supportedSource } from '../../edliz-index';

export async function GET(request: Request) {
  const hash = new URL(request.url).searchParams.get('hash');
  if (hash !== supportedSource) return new Response('Index unavailable', { status: 404 });
  const published = await env.BUCKET?.head('public-source/current.pdf');
  if (published?.customMetadata?.hash !== hash) return new Response('Index unavailable', { status: 404 });
  // The generated file contains the exact text and index for this PDF checksum.
  const origin = new URL(request.url).origin;
  return Response.redirect(origin + '/reference/' + hash + '.json', 302);
}
