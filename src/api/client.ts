import type {
  ApiHealth,
  ActiveStoreEmployeesResponse,
  AttendanceActionResponse,
  DeviceRead,
  DeviceLoginResponse,
  EmployeeRead,
  InvoiceTodayResponse,
  InvoiceUploadResponse,
  PlanogramListResponse,
  PhotoReportTemplateResponse,
  PhotoReportUploadResponse,
  StoreRequestResponse,
  StoreRequestRouteKey,
  StoreTaskActionResponse,
  StoreTaskDetail,
  StoreTaskListResponse,
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

  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
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

export function getStoreRequestActiveEmployees(deviceToken: string) {
  return apiRequest<ActiveStoreEmployeesResponse>(
    '/api/store-requests/active-employees',
    {},
    { deviceToken },
  )
}

export function createStoreRequest(
  deviceToken: string,
  payload: {
    route_key: StoreRequestRouteKey
    request_type?: string | null
    employee_id?: number | null
    message: string
  },
) {
  return apiRequest<StoreRequestResponse>(
    '/api/store-requests',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { deviceToken },
  )
}

export function uploadInvoice(deviceToken: string, formData: FormData) {
  return apiRequest<InvoiceUploadResponse>(
    '/api/invoices/upload',
    {
      method: 'POST',
      body: formData,
    },
    { deviceToken },
  )
}

export function getTodayInvoices(deviceToken: string) {
  return apiRequest<InvoiceTodayResponse>(
    '/api/invoices/today',
    {},
    { deviceToken },
  )
}

export function getPhotoReportTemplate(deviceToken: string) {
  return apiRequest<PhotoReportTemplateResponse>(
    '/api/photo-reports/template',
    {},
    { deviceToken },
  )
}

export function submitPhotoReport(deviceToken: string, formData: FormData) {
  return apiRequest<PhotoReportUploadResponse>(
    '/api/photo-reports',
    {
      method: 'POST',
      body: formData,
    },
    { deviceToken },
  )
}

export function getPlanograms(deviceToken: string) {
  return apiRequest<PlanogramListResponse>(
    '/api/planograms',
    {},
    { deviceToken },
  )
}

export function getStoreTasks(deviceToken: string, statusFilter?: string) {
  const query = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : ''
  return apiRequest<StoreTaskListResponse>(
    `/api/store-tasks${query}`,
    {},
    { deviceToken },
  )
}

export function getStoreTask(deviceToken: string, taskId: number) {
  return apiRequest<StoreTaskDetail>(
    `/api/store-tasks/${taskId}`,
    {},
    { deviceToken },
  )
}

export function startStoreTask(deviceToken: string, taskId: number) {
  return apiRequest<StoreTaskActionResponse>(
    `/api/store-tasks/${taskId}/start`,
    { method: 'POST' },
    { deviceToken },
  )
}

export function submitStoreTask(deviceToken: string, taskId: number, formData: FormData) {
  return apiRequest<StoreTaskActionResponse>(
    `/api/store-tasks/${taskId}/submit`,
    {
      method: 'POST',
      body: formData,
    },
    { deviceToken },
  )
}
