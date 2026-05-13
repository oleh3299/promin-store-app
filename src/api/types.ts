export type ApiHealth = {
  status: string
}

export type DeviceRegisterResponse = {
  id: number
  device_uuid: string
  status: string
  device_token: string
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
