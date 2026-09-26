import { generateWebhookSecret, signWebhookPayload } from '../lib/webhookSignature';

describe('webhookSignature', () => {
  it('matches the RFC 4231 HMAC-SHA256 test vector', async () => {
    expect(await signWebhookPayload('key', 'The quick brown fox jumps over the lazy dog')).toBe(
      'sha256=f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
    );
  });

  it('generates unique whsec_ secrets', () => {
    const a = generateWebhookSecret();
    expect(a).toMatch(/^whsec_[0-9a-f]{64}$/);
    expect(generateWebhookSecret()).not.toBe(a);
  });
});
