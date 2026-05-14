export type ApiHealth = {
  status: string
}

export type DeviceLoginResponse = {
  ok: boolean
  device_token: string
  device: {
    id: number
    store_id: number | null
    store_code: string | null
    store_name: string | null
    device_name: string
  }
}

export type DeviceRead = {
  id: number
  store_id: number | null
  login: string | null
  device_uuid: string
  device_name: string
  platform: string
  is_active: boolean
  status: string
  last_seen_at: string | null
  disabled_at: string | null
  disabled_reason: string | null
}

export type EmployeeRead = {
  id: number
  store_id: number | null
  full_name: string
  barcode: string
  position: string
  is_active: boolean
  external_1c_id: string | null
}

export type AttendanceShiftRead = {
  id: number
  employee_id: number
  store_id: number
  device_id: number | null
  checkin_at: string
  checkout_at: string | null
  status: string
}

export type AttendanceActionResponse = {
  shift: AttendanceShiftRead
  event_id: number
}

export type StoreRequestRouteKey =
  | 'purchase'
  | 'accounting'
  | 'it'
  | 'manager'
  | 'security'
  | 'repair'
  | 'cash'
  | 'other'

export type ActiveStoreEmployee = {
  employee_id: number
  full_name: string
  position: string
  checkin_at: string
}

export type ActiveStoreEmployeesResponse = {
  items: ActiveStoreEmployee[]
}

export type StoreRequestResponse = {
  ok: boolean
  status: string | null
  route_key: string | null
  error: string | null
  message: string | null
}

export type InvoiceRequestType = 'incoming' | 'return' | 'writeoff' | 'assembly'

export type InvoiceUploadResponse = {
  ok: boolean
  status: string | null
  request_type: string | null
  error: string | null
  message: string | null
}

export type InvoiceTodayItem = {
  id: number
  request_type: InvoiceRequestType
  request_type_label: string
  employee_name: string | null
  status: string
  created_at: string
  sent_at: string | null
}

export type InvoiceTodayResponse = {
  items: InvoiceTodayItem[]
}

export type PhotoReportTemplateItem = {
  id: number
  item_key: string
  item_name: string
  title: string
  description: string | null
  sort_order: number
  is_required: boolean
}

export type PhotoReportTemplateResponse = {
  items: PhotoReportTemplateItem[]
}

export type PhotoReportUploadResponse = {
  ok: boolean
  report_id: number | null
  items_done: number | null
  items_total: number | null
  status: string | null
  error: string | null
  message: string | null
}
