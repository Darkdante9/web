import { migrateStorage } from './storage'

// Registry of storage migrations keyed by the version they upgrade TO.
// Bump CURRENT_STORAGE_VERSION in storage.ts alongside adding an entry here.
export const migrations: Record<number, () => void> = {
  // v1: baseline schema; unversioned (v0) data is already compatible.
  1: () => {},
}

export function runMigrations() {
  migrateStorage(migrations)
}
