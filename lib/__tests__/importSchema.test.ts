import { buildSnapshot, parseImport, validateContractEntry } from '../importSchema'

const CID = 'C' + 'A'.repeat(55)
const good = {
  id: 'c1',
  label: 'Alpha',
  contract_id: CID,
  network: 'testnet',
  rules: [{ type: 'AnyTransaction' }],
  webhook_url: 'https://example.com/hook',
  created_at: 1,
  updated_at: 2,
}

describe('parseImport', () => {
  it('accepts valid entries', () => {
    const r = parseImport(JSON.stringify(buildSnapshot([good as never])))
    expect(r.contracts).toHaveLength(1)
    expect(r.errors).toEqual([])
  })

  it('reports per-entry errors without failing the import', () => {
    const r = parseImport(
      JSON.stringify({ version: 1, contracts: [good, { ...good, network: 'nope' }, 5] }),
    )
    expect(r.contracts).toHaveLength(1)
    expect(r.errors.map((e) => e.index)).toEqual([1, 2])
  })

  it('rejects bad JSON and bad envelope', () => {
    expect(() => parseImport('{')).toThrow(/Invalid JSON/)
    expect(() => parseImport('{"version":2,"contracts":[]}')).toThrow(/Invalid snapshot/)
  })

  it('rejects legacy address-only entries', () => {
    expect(typeof validateContractEntry({ id: 'x', address: 'GABC', network: 'mainnet' })).toBe('string')
  })

  it('validates rules and webhook url', () => {
    expect(validateContractEntry({ ...good, rules: [{ type: 'Bogus' }] })).toMatch(/rule type/)
    expect(validateContractEntry({ ...good, webhook_url: 'nope' })).toMatch(/webhook_url/)
  })
})
