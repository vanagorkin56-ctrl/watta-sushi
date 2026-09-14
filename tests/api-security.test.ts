import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as checkout } from '../app/api/checkout/route';
import { POST as deliveryQuote } from '../app/api/delivery-quote/route';
import { resetRateLimitsForTests } from '../lib/security';

process.env.APP_URL = 'http://localhost:3000';

const jsonHeaders = (origin = 'http://localhost:3000', ip = '203.0.113.20') => ({
  'content-type': 'application/json',
  origin,
  'x-real-ip': ip,
});

test('checkout rejects cross-origin, non-JSON, and oversized requests before processing', async () => {
  resetRateLimitsForTests();
  const foreign = await checkout(new Request('http://localhost:3000/api/checkout', {
    method: 'POST', headers: jsonHeaders('https://evil.example'), body: '{}',
  }));
  assert.equal(foreign.status, 403);
  assert.equal(foreign.headers.get('access-control-allow-origin'), null);

  const wrongType = await checkout(new Request('http://localhost:3000/api/checkout', {
    method: 'POST', headers: { origin: 'http://localhost:3000' }, body: '{}',
  }));
  assert.equal(wrongType.status, 415);

  const oversized = await checkout(new Request('http://localhost:3000/api/checkout', {
    method: 'POST', headers: { ...jsonHeaders(), 'content-length': '20001' }, body: '{}',
  }));
  assert.equal(oversized.status, 413);
});

test('metered delivery quotes reject hostile origins and throttle repeated requests', async () => {
  resetRateLimitsForTests();
  const foreign = await deliveryQuote(new Request('http://localhost:3000/api/delivery-quote', {
    method: 'POST', headers: jsonHeaders('https://evil.example'), body: '{}',
  }));
  assert.equal(foreign.status, 403);

  let response: Response | undefined;
  for (let attempt = 0; attempt < 11; attempt += 1) {
    response = await deliveryQuote(new Request('http://localhost:3000/api/delivery-quote', {
      method: 'POST', headers: jsonHeaders('http://localhost:3000', '203.0.113.21'), body: '{}',
    }));
  }
  assert.equal(response?.status, 429);
  assert.match(response?.headers.get('retry-after') || '', /^\d+$/);
  resetRateLimitsForTests();
});
