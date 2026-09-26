'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { WatchedContract, Network } from '@/types'
import { getContracts, getAlerts } from '@/lib/storage'
import { refreshContracts } from '@/lib/contractSync'
import ContractCard from '@/components/ContractCard'
import EmptyState from '@/components/EmptyState'
import { NETWORK_COLORS } from '@/components/NetworkBadge'

type ViewMode = 'flat' | 'grouped'
type NetworkFilter = 'all' | Network
type SortOption = 'newest' | 'oldest' | 'label-asc' | 'label-desc'

const PAGE_SIZE = 12

const PREFS_KEY = 'txwatch_prefs'

const NETWORK_LABELS: Record<Network, string> = {
  mainnet: 'Mainnet',
  testnet: 'Testnet',
  futurenet: 'Futurenet',
}

const NETWORK_FILTERS: { value: NetworkFilter; label: string }[] = [
  { value: 'all', label: 'All Networks' },
  { value: 'mainnet', label: 'Mainnet' },
  { value: 'testnet', label: 'Testnet' },
  { value: 'futurenet', label: 'Futurenet' },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'label-asc', label: 'Label A–Z' },
  { value: 'label-desc', label: 'Label Z–A' },
]

const VIEW_MODES: ViewMode[] = ['flat', 'grouped']
const SORT_VALUES: SortOption[] = ['newest', 'oldest', 'label-asc', 'label-desc']

export function readPrefs(): { viewMode?: ViewMode; sortBy?: SortOption } {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { viewMode?: unknown; sortBy?: unknown }
    const prefs: { viewMode?: ViewMode; sortBy?: SortOption } = {}
    if (VIEW_MODES.includes(parsed.viewMode as ViewMode)) {
      prefs.viewMode = parsed.viewMode as ViewMode
    }
    if (SORT_VALUES.includes(parsed.sortBy as SortOption)) {
      prefs.sortBy = parsed.sortBy as SortOption
    }
    return prefs
  } catch {
    return {}
  }
}

export function writePrefs(prefs: { viewMode?: ViewMode; sortBy?: SortOption }) {
  try {
    const existing = readPrefs()
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...existing, ...prefs }))
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

export function resolveInitialPrefs(params: {
  viewMode?: string | null
  sortBy?: string | null
}): { viewMode: ViewMode; sortBy: SortOption } {
  const stored = readPrefs()
  const urlView = params.viewMode
  const urlSort = params.sortBy
  return {
    viewMode: VIEW_MODES.includes(urlView as ViewMode)
      ? (urlView as ViewMode)
      : stored.viewMode ?? 'flat',
    sortBy: SORT_VALUES.includes(urlSort as SortOption)
      ? (urlSort as SortOption)
      : stored.sortBy ?? 'newest',
  }
}

function sortContracts(contracts: WatchedContract[], sortBy: SortOption) {
  const sorted = [...contracts]
  switch (sortBy) {
    case 'oldest':
      return sorted.sort((a, b) => a.created_at - b.created_at)
    case 'label-asc':
      return sorted.sort((a, b) => a.label.localeCompare(b.label))
    case 'label-desc':
      return sorted.sort((a, b) => b.label.localeCompare(a.label))
    case 'newest':
    default:
      return sorted.sort((a, b) => b.created_at - a.created_at)
  }
}

export default function ContractsPage() {
  const searchParams = useSearchParams()
  const [allContracts, setAllContracts] = useState<WatchedContract[]>([])
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [search, setSearch] = useState(() => searchParams?.get('q') ?? '')
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('flat')
  const [page, setPage] = useState(1)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  useEffect(() => {
    const all = getContracts()
    setAllContracts(all)
    setMounted(true)
    // With NEXT_PUBLIC_API_URL set, the API is the source of truth.
    refreshContracts().then((r) => setAllContracts(r.contracts))
  }, [])

  // Restore persisted view/sort preferences. URL params take precedence over stored prefs.
  useEffect(() => {
    const initial = resolveInitialPrefs({
      viewMode: searchParams?.get('view'),
      sortBy: searchParams?.get('sort'),
    })
    setViewMode(initial.viewMode)
    setSortBy(initial.sortBy)
  }, [searchParams])

  // Check for a recently-created contract id in sessionStorage and highlight it once
  useEffect(() => {
    try {
      const id = sessionStorage.getItem('txwatch_last_created_contract')
      if (id) {
        setHighlightedId(id)
        sessionStorage.removeItem('txwatch_last_created_contract')
        const t = setTimeout(() => setHighlightedId(null), 6000)
        return () => clearTimeout(t)
      }
    } catch {
      // ignore (server-side or storage issues)
    }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [networkFilter, search])

  const networkFiltered = useMemo(() => {
    if (networkFilter === 'all') {
      return allContracts
    }
    return allContracts.filter((contract) => contract.network === networkFilter)
  }, [allContracts, networkFilter])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return networkFiltered

    return networkFiltered.filter((contract) => {
      return (
        contract.label.toLowerCase().includes(query) ||
        contract.contract_id.toLowerCase().includes(query)
      )
    })
  }, [networkFiltered, search])

  const sorted = useMemo(() => sortContracts(filtered, sortBy), [filtered, sortBy])
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, sorted]
  )

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const grouped = useMemo(() => {
    const groups: Record<Network, WatchedContract[]> = {
      mainnet: [],
      testnet: [],
      futurenet: [],
    }
    for (const contract of sorted) {
      groups[contract.network].push(contract)
    }
    return groups
  }, [sorted])

  if (!mounted) return null

  const hasAnyContracts = allContracts.length > 0
  const hasFilteredContracts = filtered.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Contracts</h1>
          <p className="text-sm text-zinc-500 mt-1">{filtered.length} registered</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-[260px] relative">
            <label htmlFor="contract-search" className="sr-only">
              Search contracts
            </label>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z" />
              </svg>
            </span>
            <input
              id="contract-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by label or contract ID"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-fit" role="group" aria-label="Filter by network">
          {NETWORK_FILTERS.map(({ value, label }) => {
            const count = value === 'all' ? allContracts.length : allContracts.filter((contract) => contract.network === value).length
            const isActive = networkFilter === value
            return (
              <button
                key={value}
                onClick={() => setNetworkFilter(value)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-indigo-500 text-indigo-100' : 'bg-zinc-800 text-zinc-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          {hasAnyContracts && (
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => {
                  const next = e.target.value as SortOption
                  setSortBy(next)
                  writePrefs({ sortBy: next })
                }}
                className="appearance-none px-3 py-2 pr-8 rounded-lg bg-zinc-800 border border-zinc-700 text-sm font-medium text-zinc-200 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-fit" role="group" aria-label="View mode">
            {VIEW_MODES.map((mode) => {
              const isActive = viewMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode)
                    writePrefs({ viewMode: mode })
                  }}
                  aria-pressed={isActive}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {mode === 'flat' ? 'Flat' : 'Grouped'}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {!hasAnyContracts ? (
        <EmptyState
          title="No contracts yet"
          description="Add a contract to start monitoring its activity."
        />
      ) : !hasFilteredContracts ? (
        <EmptyState
          title="No matching contracts"
          description="Try adjusting your search or network filter."
        />
      ) : viewMode === 'grouped' ? (
        <div className="space-y-8">
          {(Object.keys(grouped) as Network[]).map((network) => {
            const contracts = grouped[network]
            if (contracts.length === 0) return null
            return (
              <section key={network} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  {NETWORK_LABELS[network]}
                  <span className="ml-2 text-zinc-600">{contracts.length}</span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {contracts.map((contract) => (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      highlighted={contract.id === highlightedId}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginated.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              highlighted={contract.id === highlightedId}
            />
          ))}
        </div>
      )}

      {viewMode === 'flat' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
