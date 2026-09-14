import { isIP } from 'node:net';

export class RequestBodyTooLargeError extends Error {}

export async function readLimitedText(request: Request, maxBytes: number) {
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    throw new RequestBodyTooLargeError('Request body is too large');
  }
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError('Request body is too large');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

type RateLimitOptions = { limit: number; windowMs: number; globalLimit?: number };
type Bucket = { startedAt: number; count: number };

declare global {
  var wattaRateLimitBuckets: Map<string, Bucket> | undefined;
}

const buckets = globalThis.wattaRateLimitBuckets ??= new Map<string, Bucket>();

function clientAddress(request: Request) {
  const forwarded = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0];
  const candidate = forwarded?.trim();
  return candidate && isIP(candidate) ? candidate : 'unknown';
}

function consume(key: string, limit: number, windowMs: number, now: number) {
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    retryAfter: Math.max(1, Math.ceil((current.startedAt + windowMs - now) / 1000)),
  };
}

export function checkRateLimit(request: Request, scope: string, options: RateLimitOptions) {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [key, bucket] of buckets) {
      if (now - bucket.startedAt >= options.windowMs) buckets.delete(key);
    }
    if (buckets.size > 5000) buckets.clear();
  }

  const client = consume(`${scope}:${clientAddress(request)}`, options.limit, options.windowMs, now);
  if (!client.allowed) return client;
  return consume(`${scope}:global`, options.globalLimit ?? options.limit * 20, options.windowMs, now);
}

export function resetRateLimitsForTests() {
  buckets.clear();
}

export function isJsonRequest(request: Request) {
  return request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}
