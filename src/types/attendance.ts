export type Screen = 'home' | 'attendance' | 'settings'

export type AttendanceMode = 'checkin' | 'checkout' | null

export type InputMethod = 'scan' | 'manual' | null

export type Position = 'Ревізор' | 'Викладка / мерчендайзер' | 'Продавець'

export type Employee = {
  id: string
  code: string
  name: string
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
