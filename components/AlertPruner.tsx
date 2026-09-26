'use client'

import { useEffect } from 'react'
import { pruneOldAlerts } from '@/lib/storage'

/** Prunes expired alerts once on app start, independent of contract edits. */
export default function AlertPruner() {
  useEffect(() => {
    pruneOldAlerts()
  }, [])
  return null
}
