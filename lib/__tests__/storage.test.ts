import type { AlertPayload, WatchedContract } from '@/types'
import {
  saveContract,
  deleteContract,
  getContracts,
  saveAlert,
  getAlerts,
  deleteAlert,
} from '../storage';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:   (key: string) => store[key] ?? null,
    setItem:   (key: string, value: string) => { store[key] = value; },
    removeItem:(key: string) => { delete store[key]; },
    clear:     () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Fixtures previously used an `address` field that WatchedContract does not
// have, and omitted every required one.
const contract1: WatchedContract = {
  id: 'c1',
  label: 'Contract Alpha',
  contract_id: 'CDSO4GGZH7KBUQYKOIQDCMCFSRYEPOVDUX7Z4IB5TWNTLT2GDRKDQOYR',
  network: 'mainnet',
  rules: [],
  webhook_url: 'https://hooks.example.com/alpha',
  created_at: 1,
  updated_at: 1,
};
const contract2: WatchedContract = {
  id: 'c2',
  label: 'Contract Beta',
  contract_id: 'CCSHRYACRNVSLC5NP3V2DL6LGID57TQT2TJXVUVXBBZX6SED6N3F7X6J',
  network: 'testnet',
  rules: [],
  webhook_url: 'https://hooks.example.com/beta',
  created_at: 2,
  updated_at: 2,
};

const alert1: AlertPayload & { id?: string; contractId?: string } = {
  id: 'a1',
  contractId: 'c1',
  label: 'Contract Alpha',
  contract_id: 'c1',
  network: 'testnet',
  rule_triggered: 'LargeTransfer',
  transaction_hash: 'tx1',
  timestamp: 1,
  horizon_link: 'https://horizon-testnet.stellar.org/transactions/tx1',
};
const alert2: AlertPayload & { id?: string; contractId?: string } = {
  id: 'a2',
  contractId: 'c1',
  label: 'Contract Alpha',
  contract_id: 'c1',
  network: 'testnet',
  rule_triggered: 'FunctionCalled',
  transaction_hash: 'tx2',
  timestamp: 2,
  horizon_link: 'https://horizon-testnet.stellar.org/transactions/tx2',
};
const alert3: AlertPayload & { id?: string; contractId?: string } = {
  id: 'a3',
  contractId: 'c1',
  label: 'Contract Alpha',
  contract_id: 'c1',
  network: 'testnet',
  rule_triggered: 'AnyTransaction',
  transaction_hash: 'tx3',
  timestamp: 3,
  horizon_link: 'https://horizon-testnet.stellar.org/transactions/tx3',
};

beforeEach(() => localStorageMock.clear());

describe('saveContract / getContracts', () => {
  it('saves a contract and retrieves it', () => {
    saveContract(contract1);
    const contracts = getContracts();
    expect(contracts).toHaveLength(1);
    expect(contracts[0].id).toBe('c1');
  });

  it('retrieves multiple saved contracts', () => {
    saveContract(contract1);
    saveContract(contract2);
    expect(getContracts()).toHaveLength(2);
  });

  it('returns empty array when no contracts saved (empty fallback)', () => {
    expect(getContracts()).toEqual([]);
  });
});

describe('deleteContract', () => {
  it('removes the correct contract by id', () => {
    saveContract(contract1);
    saveContract(contract2);
    deleteContract('c1');
    const remaining = getContracts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('c2');
  });

  it('is a no-op when deleting a non-existent id', () => {
    saveContract(contract1);
    deleteContract('does-not-exist');
    expect(getContracts()).toHaveLength(1);
  });

  it('results in empty array after deleting the only contract', () => {
    saveContract(contract1);
    deleteContract('c1');
    expect(getContracts()).toEqual([]);
  });
});

describe('duplicate contract handling', () => {
  it('does not create a duplicate when saving the same id twice', () => {
    saveContract(contract1);
    saveContract({ ...contract1, label: 'Updated Label' });
    const contracts = getContracts();
    expect(contracts).toHaveLength(1);
  });

  it('updates the existing entry when saving a duplicate id', () => {
    saveContract(contract1);
    saveContract({ ...contract1, label: 'Updated Label' });
    expect(getContracts()[0].label).toBe('Updated Label');
  });
});

describe('saveAlert / getAlerts — insertion order', () => {
  it('returns alerts in insertion order', () => {
    saveAlert(alert1);
    saveAlert(alert2);
    saveAlert(alert3);
    const alerts = getAlerts('c1');
    expect(alerts.map((a) => (a as { id?: string }).id)).toEqual(['a1', 'a2', 'a3']);
  });

  it('returns empty array when no alerts exist for a contract (empty fallback)', () => {
    expect(getAlerts('no-such-contract')).toEqual([]);
  });
});

describe('deleteAlert', () => {
  it('removes only the specified alert', () => {
    saveAlert(alert1);
    saveAlert(alert2);
    deleteAlert('a1');
    const alerts = getAlerts('c1');
    expect(alerts).toHaveLength(1);
    expect((alerts[0] as { id?: string }).id).toBe('a2');
  });
});
