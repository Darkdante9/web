/** Header carrying the hex HMAC-SHA256 of the raw request body, prefixed "sha256=". */
export const SIGNATURE_HEADER = 'X-TxWatch-Signature'

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')

/** Generates a random 32-byte webhook signing secret (hex, prefixed "whsec_"). */
export function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return `whsec_${toHex(bytes.buffer)}`
}

/** Computes the X-TxWatch-Signature value for a raw request body. */
export async function signWebhookPayload(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return `sha256=${toHex(await crypto.subtle.sign('HMAC', key, enc.encode(body)))}`
}
