import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }))
vi.mock('@/lib/storage', () => ({ addAlert: vi.fn(), getAlerts: vi.fn() }))

import { apiFetch } from '@/lib/api'
import { addAlert, getAlerts } from '@/lib/storage'
import { fetchAlerts, filterNewAlerts, syncAlerts, startAlertPolling } from '@/lib/alertSource'
import type { AlertPayload } from '@/types'

const mk = (hash: string, rule = 'AnyTransaction', timestamp = 1): AlertPayload => ({
  label: 'l',
  contract_id: 'C1',
  network: 'testnet',
  rule_triggered: rule,
  transaction_hash: hash,
  timestamp,
  horizon_link: 'x',
})

beforeEach(() => vi.clearAllMocks())

describe('fetchAlerts', () => {
  it('builds the query and unwraps { alerts }', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ alerts: [mk('a')] })
    const r = await fetchAlerts('C1', 'testnet', { since: 5 })
    expect(r).toHaveLength(1)
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe(
      '/alerts?contract_id=C1&network=testnet&since=5'
    )
  })
  it('returns [] for an empty response', async () => {
    vi.mocked(apiFetch).mockResolvedValue(undefined)
    expect(await fetchAlerts('C1', 'testnet')).toEqual([])
  })
})

describe('filterNewAlerts', () => {
  it('dedupes by tx hash + rule', () => {
    const out = filterNewAlerts([mk('a')], [mk('a'), mk('a', 'Other'), mk('b'), mk('b')])
    expect(out.map((a) => `${a.transaction_hash}/${a.rule_triggered}`)).toEqual([
      'a/Other',
      'b/AnyTransaction',
    ])
  })
})

describe('syncAlerts', () => {
  it('adds only new alerts, using the newest local timestamp as since', async () => {
    vi.mocked(getAlerts).mockReturnValue([mk('a', 'AnyTransaction', 10)])
    vi.mocked(apiFetch).mockResolvedValue([mk('a'), mk('b', 'AnyTransaction', 20)])
    const fresh = await syncAlerts('C1', 'testnet')
    expect(fresh.map((a) => a.transaction_hash)).toEqual(['b'])
    expect(addAlert).toHaveBeenCalledTimes(1)
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toContain('since=10')
  })
})

describe('startAlertPolling', () => {
  it('polls on the interval and stops', async () => {
    vi.useFakeTimers()
    vi.mocked(getAlerts).mockReturnValue([])
    vi.mocked(apiFetch).mockResolvedValue([])
    const onSync = vi.fn()
    const stop = startAlertPolling('C1', 'testnet', { onSync }, 1000)
    await vi.advanceTimersByTimeAsync(2100)
    expect(onSync).toHaveBeenCalledTimes(3)
    stop()
    await vi.advanceTimersByTimeAsync(3000)
    expect(onSync).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
  })
})
