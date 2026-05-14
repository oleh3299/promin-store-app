export type Screen = 'home' | 'attendance' | 'settings' | 'login' | 'diagnostics' | 'storeRequests'

export type StoreRequestEntry = 'default' | 'urgentIt'

export type AttendanceMode = 'checkin' | 'checkout' | null

export type InputMethod = 'scan' | 'manual' | null

export type Position = 'Ревізор' | 'Викладка / мерчендайзер' | 'Продавець'

export type Employee = {
  id: string
  backendId?: number
  code: string
  name: string
  position?: Position
}

export type OfflineAttendanceEvent = {
  id: string
  type: 'checkin' | 'checkout'
  employeeId: string
  employeeBackendId?: number
  employeeCode: string
  employeeName: string
  position?: Position
  eventTime: string
}

export type AuthState = {
  accessToken: string | null
  deviceLogin: string | null
  fullName: string | null
}

export type DeviceState = {
  id: number | null
  deviceUuid: string
  deviceToken: string | null
  status: string | null
  login: string | null
  storeId: number | null
  storeCode: string | null
  storeName: string | null
  deviceName: string | null
}

export type SyncState = {
  apiStatus: 'unknown' | 'online' | 'offline'
  lastSyncAt: string | null
  lastSyncMessage: string | null
}

export type Shift = {
  employeeId: string
  employeeName: string
  position: Position
  checkInTime: string
  checkOutTime?: string
}

export type AttendancePageState = {
  mode: AttendanceMode
  inputMethod: InputMethod
  employeeCode: string
  selectedEmployeeId: string | null
  selectedPosition: Position | null
}
