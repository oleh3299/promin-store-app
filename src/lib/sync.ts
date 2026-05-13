import { checkIn, checkOut, getHealth } from '../api/client'
import type { DeviceState, OfflineAttendanceEvent, SyncState } from '../types/attendance'

export async function syncOfflineQueue(
  queue: OfflineAttendanceEvent[],
  device: DeviceState,
): Promise<{ queue: OfflineAttendanceEvent[]; sync: SyncState }> {
  try {
    await getHealth()
  } catch {
    return {
      queue,
      sync: {
        apiStatus: 'offline',
        lastSyncAt: new Date().toISOString(),
        lastSyncMessage: 'API unavailable',
      },
    }
  }

  if (!device.deviceToken) {
    return {
      queue,
      sync: {
        apiStatus: 'online',
        lastSyncAt: new Date().toISOString(),
        lastSyncMessage: 'Device is not registered',
      },
    }
  }

  const remaining = [...queue]
  while (remaining.length > 0) {
    const event = remaining[0]
    const payload = {
      employee_id: event.employeeBackendId,
      barcode: event.employeeBackendId ? undefined : event.employeeCode,
      event_time: event.eventTime,
      raw_payload: {
        offline_event_id: event.id,
        position: event.position,
      },
    }

    try {
      if (event.type === 'checkin') {
        await checkIn(device.deviceToken, payload)
      } else {
        await checkOut(device.deviceToken, payload)
      }
      remaining.shift()
    } catch (error) {
      return {
        queue: remaining,
        sync: {
          apiStatus: 'online',
          lastSyncAt: new Date().toISOString(),
          lastSyncMessage:
            error instanceof Error ? error.message : 'Sync failed',
        },
      }
    }
  }

  return {
    queue: remaining,
    sync: {
      apiStatus: 'online',
      lastSyncAt: new Date().toISOString(),
      lastSyncMessage: 'Synced',
    },
  }
}
