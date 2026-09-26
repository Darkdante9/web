import { afterEach, describe, expect, it, vi } from 'vitest'
import { HORIZON_URLS, SOROBAN_RPC_URLS, horizonUrl, sorobanRpcUrl } from '@/lib/stellar'

describe('network URL overrides', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('falls back to defaults', () => {
    expect(horizonUrl('testnet')).toBe(HORIZON_URLS.testnet)
    expect(sorobanRpcUrl('mainnet')).toBe(SOROBAN_RPC_URLS.mainnet)
  })

  it('uses the global override and trims trailing slashes', () => {
    vi.stubEnv('NEXT_PUBLIC_HORIZON_URL', 'https://h.example/')
    expect(horizonUrl('futurenet')).toBe('https://h.example')
  })

  it('prefers per-network over global', () => {
    vi.stubEnv('NEXT_PUBLIC_SOROBAN_RPC_URL', 'https://global.example')
    vi.stubEnv('NEXT_PUBLIC_SOROBAN_RPC_URL_MAINNET', 'https://main.example')
    expect(sorobanRpcUrl('mainnet')).toBe('https://main.example')
    expect(sorobanRpcUrl('testnet')).toBe('https://global.example')
  })

  it('ignores blank values', () => {
    vi.stubEnv('NEXT_PUBLIC_HORIZON_URL', '  ')
    expect(horizonUrl('mainnet')).toBe(HORIZON_URLS.mainnet)
  })
})
