import type {
  ApiHealth,
  AttendanceActionResponse,
  DeviceRead,
  DeviceLoginResponse,
  DeviceRegisterResponse,
  EmployeeRead,
} from './types'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://api-store.prominuz.org'

type RequestOptions = {
  accessToken?: string | null
  deviceToken?: string | null
}

export class ApiError extends Error {
  status: number
  path: string
  responseBody: unknown

  constructor(status: number, message: string, path: string, responseBody: unknown) {
    super(message)
    this.status = status
    this.path = path
    this.responseBody = responseBody
  }
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers)

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`)
  }

  if (options.deviceToken) {
    headers.set('X-Device-Token', options.deviceToken)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    })
  } catch (error) {
    console.error('API network error', {
      endpoint: `${API_BASE_URL}${path}`,
      error,
    })
    throw error
  }

  if (!response.ok) {
    let detail = response.statusText
    let responseBody: unknown = null
    try {
      responseBody = await response.json()
      if (
        responseBody &&
        typeof responseBody === 'object' &&
        'detail' in responseBody
      ) {
        detail = String(responseBody.detail)
      }
    } catch {
      // Keep response status text when the body is not JSON.
    }

    console.error('API response error', {
      endpoint: `${API_BASE_URL}${path}`,
      status: response.status,
      responseBody,
    })

    throw new ApiError(response.status, detail, path, responseBody)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function getHealth() {
  return apiRequest<ApiHealth>('/health')
}

export function loginDevice(deviceLogin: string, password: string) {
  return apiRequest<DeviceLoginResponse>('/api/devices/login', {
    method: 'POST',
    body: JSON.stringify({ login: deviceLogin, password }),
  })
}

export function registerDevice(deviceUuid: string, storeCode: string) {
  return apiRequest<DeviceRegisterResponse>('/api/devices/register', {
    method: 'POST',
    body: JSON.stringify({
      device_uuid: deviceUuid,
      device_name: navigator.userAgent,
      platform: navigator.platform || 'pwa',
      store_code: storeCode,
    }),
  })
}

export function getDeviceMe(deviceToken: string) {
  return apiRequest<DeviceRead>('/api/devices/me', {}, { deviceToken })
}

export function getEmployeeByBarcode(barcode: string, deviceToken: string) {
  return apiRequest<EmployeeRead>(
    `/api/employees/by-barcode/${encodeURIComponent(barcode)}`,
    {},
    { deviceToken },
  )
}

export function checkIn(
  deviceToken: string,
  payload: {
    employee_id?: number
    barcode?: string
    event_time?: string
    raw_payload?: Record<string, unknown>
  },
) {
  return apiRequest<AttendanceActionResponse>(
    '/api/attendance/checkin',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { deviceToken },
  )
}

export function checkOut(
  deviceToken: string,
  payload: {
    employee_id?: number
    barcode?: string
    event_time?: string
    raw_payload?: Record<string, unknown>
  },
) {
  return apiRequest<AttendanceActionResponse>(
    '/api/attendance/checkout',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { deviceToken },
  )
}
