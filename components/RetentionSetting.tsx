'use client'

import { useState } from 'react'
import { getRetentionDays, setRetentionDays } from '@/lib/storage'

export default function RetentionSetting() {
  const [days, setDays] = useState(() => getRetentionDays())

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Alert retention</h2>
      <label className="block text-sm text-zinc-400" htmlFor="retention-days">
        Keep alerts for (days)
      </label>
      <input
        id="retention-days"
        type="number"
        min={1}
        value={days}
        onChange={(e) => {
          const n = Number(e.target.value)
          setDays(n)
          setRetentionDays(n)
        }}
        className="w-24 bg-zinc-900 border border-zinc-800 rounded px-2 py-1"
      />
    </section>
  )
}
