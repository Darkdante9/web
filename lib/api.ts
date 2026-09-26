import { SIGNATURE_HEADER, signWebhookPayload } from './webhookSignature'
import { HORIZON_URLS } from '@/lib/stellar'
import type { Network } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers)
  if (!headers.has('content-type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const text = await res.text()
    let message = `HTTP ${res.status}`
    if (text) {
      try {
        const body = JSON.parse(text)
        message = body?.message || body?.error || text
      } catch {
        message = text
      }
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

/** Result of a test webhook delivery: the HTTP status and whether it succeeded. */
export interface TestWebhookResult {
  status: number
  ok: boolean
}

export async function sendTestWebhook(
  webhookUrl: string,
  contractId: string,
  network: Network = 'testnet',
  signalOrTimeoutMs: AbortSignal | number = 10000,
  secret?: string
): Promise<TestWebhookResult> {
  const payload = {
    label: 'Test Alert',
    contract_id: contractId,
    network,
    rule_triggered: 'AnyTransaction',
    transaction_hash:
      'TEST_HASH_0000000000000000000000000000000000000000000000000000000000000000',
    timestamp: Date.now(),
    horizon_link: `${HORIZON_URLS[network]}/transactions/test`,
  }

  // Callers either hand us their own AbortSignal or rely on the default timeout.
  const external = typeof signalOrTimeoutMs === 'number' ? undefined : signalOrTimeoutMs
  const controller = new AbortController()
  const timeoutId =
    external === undefined
      ? setTimeout(() => controller.abort(), signalOrTimeoutMs as number)
      : undefined
  const signal = external ?? controller.signal

  try {
    const body = JSON.stringify(payload)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (secret) headers[SIGNATURE_HEADER] = await signWebhookPayload(secret, body)
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body,
      signal,
    })
    // The status is reported back rather than thrown on, so callers can show
    // the actual code; a non-2xx is still a failed delivery.
    return { status: res.status, ok: res.ok }
  } catch (error) {
    const err = error as { name?: string }
    if (err?.name === 'AbortError') {
      throw new Error('Webhook request timed out')
    }
    throw error
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}
