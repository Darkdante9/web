import { migrateStorage } from '../storage';
import { migrations, runMigrations } from '../migrations';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

beforeEach(() => localStorageMock.clear());

describe('migrations', () => {
  it('upgrades v0 to v1 and writes the version key', () => {
    const ran: number[] = [];
    migrateStorage({ 1: () => ran.push(1) });
    expect(ran).toEqual([1]);
    expect(store['txwatch_storage_version']).toBe('1');
  });

  it('is idempotent', () => {
    const ran: number[] = [];
    migrateStorage({ 1: () => ran.push(1) });
    migrateStorage({ 1: () => ran.push(1) });
    expect(ran).toEqual([1]);
    expect(store['txwatch_storage_version']).toBe('1');
  });

  it('runMigrations uses the registry', () => {
    expect(migrations[1]).toBeTypeOf('function');
    runMigrations();
    expect(store['txwatch_storage_version']).toBe('1');
  });
});
