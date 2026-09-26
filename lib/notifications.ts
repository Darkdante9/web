import type { AlertPayload } from '@/types'

export const NOTIFICATIONS_KEY = 'txwatch:notifications-enabled'
export const NOTIFY_THROTTLE_MS = 10000

let lastNotifiedAt = 0

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationsEnabled(): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  try {
    return localStorage.getItem(NOTIFICATIONS_KEY) === '1'
  } catch {
    return false
  }
}

/** Opt in: requests permission, and stores the preference only if granted. */
export async function enableNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false
  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission
  const ok = permission === 'granted'
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, ok ? '1' : '0')
  } catch {}
  return ok
}

export function disableNotifications(): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, '0')
  } catch {}
}

/**
 * Notify about new alerts for a contract. Bursts are grouped into a single
 * notification and calls within NOTIFY_THROTTLE_MS of the last one are dropped.
 * Returns true if a notification was shown.
 */
export function notifyNewAlerts(
  alerts: AlertPayload[],
  contractLabel: string,
  contractPath: string,
  now: number = Date.now()
): boolean {
  if (alerts.length === 0 || !notificationsEnabled()) return false
  if (now - lastNotifiedAt < NOTIFY_THROTTLE_MS) return false
  lastNotifiedAt = now

  const title = alerts.length === 1 ? `New alert: ${contractLabel}` : `${alerts.length} new alerts: ${contractLabel}`
  const body =
    alerts.length === 1
      ? `${alerts[0].rule_triggered} (${alerts[0].transaction_hash.slice(0, 12)}...)`
      : `${alerts.length} transactions matched your rules`
  const n = new Notification(title, { body, tag: `txwatch:${contractPath}` })
  n.onclick = () => {
    window.focus()
    window.location.assign(contractPath)
  }
  return true
}

/** Test helper. */
export function resetNotificationThrottle(): void {
  lastNotifiedAt = 0
}
