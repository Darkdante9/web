'use client'

import { useEffect, useState } from 'react'
import {
  disableNotifications,
  enableNotifications,
  notificationsEnabled,
  notificationsSupported,
} from '@/lib/notifications'

export default function NotificationToggle() {
  const [supported, setSupported] = useState(false)
  const [on, setOn] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    setSupported(notificationsSupported())
    setOn(notificationsEnabled())
  }, [])

  if (!supported) return null

  async function toggle() {
    if (on) {
      disableNotifications()
      setOn(false)
      return
    }
    const ok = await enableNotifications()
    setOn(ok)
    setDenied(!ok)
  }

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300">
      <input type="checkbox" checked={on} onChange={toggle} />
      Browser notifications for new alerts
      {denied && <span className="text-xs text-red-400">Permission denied</span>}
    </label>
  )
}
