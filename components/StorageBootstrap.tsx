'use client'

import { useEffect } from 'react'
import { runMigrations } from '@/lib/migrations'

export default function StorageBootstrap() {
  useEffect(() => {
    runMigrations()
  }, [])
  return null
}
