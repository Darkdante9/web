import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  enableNotifications,
  notifyNewAlerts,
  resetNotificationThrottle,
  NOTIFY_THROTTLE_MS,
} from '@/lib/notifications'
import type { AlertPayload } from '@/types'

const alert = (h: string): AlertPayload => ({
  label: 'l',
  contract_id: 'C1',
  network: 'testnet',
  rule_triggered: 'AnyTransaction',
  transaction_hash: h + 'x'.repeat(20),
  timestamp: 1,
  horizon_link: 'x',
})

let ctor: ReturnType<typeof vi.fn>
function mockNotification(permission: string, request = 'granted') {
  ctor = vi.fn()
  const N = ctor as unknown as { permission: string; requestPermission: unknown }
  N.permission = permission
  N.requestPermission = vi.fn().mockResolvedValue(request)
  vi.stubGlobal('Notification', N)
  ;(window as unknown as { Notification: unknown }).Notification = N
}

beforeEach(() => {
  localStorage.clear()
  resetNotificationThrottle()
})

describe('notifications', () => {
  it('does nothing until opted in', () => {
    mockNotification('granted')
    expect(notifyNewAlerts([alert('a')], 'L', '/contracts/1')).toBe(false)
    expect(ctor).not.toHaveBeenCalled()
  })

  it('requests permission on enable and stores preference', async () => {
    mockNotification('default', 'granted')
    expect(await enableNotifications()).toBe(true)
    expect(localStorage.getItem('txwatch:notifications-enabled')).toBe('1')
  })

  it('does not enable when denied', async () => {
    mockNotification('default', 'denied')
    expect(await enableNotifications()).toBe(false)
  })

  it('groups bursts into one notification and throttles', async () => {
    mockNotification('default', 'granted')
    await enableNotifications()
    ;(ctor as unknown as { permission: string }).permission = 'granted'
    expect(notifyNewAlerts([alert('a'), alert('b')], 'L', '/contracts/1', 1000)).toBe(true)
    expect(ctor).toHaveBeenCalledTimes(1)
    expect(ctor.mock.calls[0][0]).toContain('2 new alerts')
    expect(notifyNewAlerts([alert('c')], 'L', '/contracts/1', 1000 + 5)).toBe(false)
    expect(notifyNewAlerts([alert('c')], 'L', '/contracts/1', 1000 + NOTIFY_THROTTLE_MS)).toBe(true)
  })
})
