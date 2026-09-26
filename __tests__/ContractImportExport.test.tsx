import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ContractImportExport from '@/components/ContractImportExport'
import { getContracts } from '@/lib/storage'

const CID = 'C' + 'A'.repeat(55)
const entry = (over = {}) => ({
  id: 'i1', label: 'A', contract_id: CID, network: 'testnet',
  rules: [{ type: 'AnyTransaction' }], webhook_url: 'https://e.com/h',
  created_at: 1, updated_at: 1, ...over,
})

function upload(json: string) {
  const file = new File([json], 'x.json', { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(json) })
  fireEvent.change(screen.getByLabelText('Import contracts'), { target: { files: [file] } })
}

beforeEach(() => localStorage.clear())

describe('ContractImportExport', () => {
  it('previews and imports valid entries, listing invalid ones', async () => {
    render(<ContractImportExport />)
    upload(JSON.stringify({ version: 1, contracts: [entry(), { bad: true }] }))
    expect(await screen.findByTestId('import-preview')).toHaveTextContent('1 valid, 1 invalid')
    fireEvent.click(screen.getByText('Apply import'))
    await waitFor(() => expect(getContracts()).toHaveLength(1))
  })

  it('shows an error for malformed files', async () => {
    render(<ContractImportExport />)
    upload('{')
    expect(await screen.findByRole('status')).toHaveTextContent('Invalid JSON')
  })
})
