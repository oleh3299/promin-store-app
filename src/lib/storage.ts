import type {
  AttendanceMode,
  AttendancePageState,
  InputMethod,
  Position,
  Screen,
  Shift,
} from '../types/attendance'
import { languageCodes, type Language } from '../i18n/translations'

const STORAGE_KEY = 'promin-store-attendance-state'
const STORAGE_VERSION = 1

export const DEFAULT_SELECTED_STORE = 'М37'
export const DEFAULT_LANGUAGE: Language = 'uk'

export const DEFAULT_ATTENDANCE_PAGE_STATE: AttendancePageState = {
  mode: null,
  inputMethod: null,
  employeeCode: '',
  selectedEmployeeId: null,
  selectedPosition: null,
}

export type AppPersistenceState = {
  selectedStore: string
  language: Language
  screen: Screen
  shifts: Shift[]
  attendancePage: AttendancePageState
}

type StoredAttendanceState = {
  version: typeof STORAGE_VERSION
  selectedStore: string
  selectedLanguage: Language
  attendance: {
    openShifts: Shift[]
    history: Shift[]
  }
  appState: {
    screen: Screen
    attendancePage: AttendancePageState
  }
}

const validModes: AttendanceMode[] = ['checkin', 'checkout', null]
const validInputMethods: InputMethod[] = ['scan', 'manual', null]
const validPositions: Position[] = [
  'Ревізор',
  'Викладка / мерчендайзер',
  'Продавець',
]

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isScreen(value: unknown): value is Screen {
  return value === 'home' || value === 'attendance' || value === 'settings'
}

function isLanguage(value: unknown): value is Language {
  return languageCodes.includes(value as Language)
}

function isPosition(value: unknown): value is Position {
  return validPositions.includes(value as Position)
}

function isAttendanceMode(value: unknown): value is AttendanceMode {
  return validModes.includes(value as AttendanceMode)
}

function isInputMethod(value: unknown): value is InputMethod {
  return validInputMethods.includes(value as InputMethod)
}

function normalizeNullableString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function normalizeAttendancePageState(value: unknown): AttendancePageState {
  if (!isObject(value)) {
    return DEFAULT_ATTENDANCE_PAGE_STATE
  }

  return {
    mode: isAttendanceMode(value.mode)
      ? value.mode
      : DEFAULT_ATTENDANCE_PAGE_STATE.mode,
    inputMethod: isInputMethod(value.inputMethod)
      ? value.inputMethod
      : DEFAULT_ATTENDANCE_PAGE_STATE.inputMethod,
    employeeCode:
      typeof value.employeeCode === 'string'
        ? value.employeeCode
        : DEFAULT_ATTENDANCE_PAGE_STATE.employeeCode,
    selectedEmployeeId: normalizeNullableString(value.selectedEmployeeId),
    selectedPosition: isPosition(value.selectedPosition)
      ? value.selectedPosition
      : DEFAULT_ATTENDANCE_PAGE_STATE.selectedPosition,
  }
}

function isShift(value: unknown): value is Shift {
  if (!isObject(value)) return false

  return (
    typeof value.employeeId === 'string' &&
    typeof value.employeeName === 'string' &&
    isPosition(value.position) &&
    typeof value.checkInTime === 'string' &&
    (value.checkOutTime === undefined || typeof value.checkOutTime === 'string')
  )
}

function normalizeShifts(value: unknown) {
  return Array.isArray(value) ? value.filter(isShift) : []
}

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

function toStoredState(state: AppPersistenceState): StoredAttendanceState {
  return {
    version: STORAGE_VERSION,
    selectedStore: state.selectedStore,
    selectedLanguage: state.language,
    attendance: {
      openShifts: state.shifts.filter((shift) => !shift.checkOutTime),
      history: state.shifts.filter((shift) => Boolean(shift.checkOutTime)),
    },
    appState: {
      screen: state.screen,
      attendancePage: state.attendancePage,
    },
  }
}

function fromStoredState(value: unknown): AppPersistenceState | null {
  if (!isObject(value)) {
    return null
  }

  const attendance = isObject(value.attendance) ? value.attendance : {}
  const appState = isObject(value.appState) ? value.appState : {}
  const openShifts = normalizeShifts(attendance.openShifts).filter(
    (shift) => !shift.checkOutTime,
  )
  const history = normalizeShifts(attendance.history).filter((shift) =>
    Boolean(shift.checkOutTime),
  )

  return {
    selectedStore:
      typeof value.selectedStore === 'string' && value.selectedStore.trim()
        ? value.selectedStore
        : DEFAULT_SELECTED_STORE,
    language: isLanguage(value.selectedLanguage)
      ? value.selectedLanguage
      : DEFAULT_LANGUAGE,
    screen: isScreen(appState.screen) ? appState.screen : 'home',
    shifts: [...openShifts, ...history],
    attendancePage: normalizeAttendancePageState(appState.attendancePage),
  }
}

export function loadAppPersistence(): AppPersistenceState {
  const storage = getStorage()

  if (!storage) {
    return {
      selectedStore: DEFAULT_SELECTED_STORE,
      language: DEFAULT_LANGUAGE,
      screen: 'home',
      shifts: [],
      attendancePage: DEFAULT_ATTENDANCE_PAGE_STATE,
    }
  }

  try {
    const stored = storage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : null
    const restored = fromStoredState(parsed)

    return (
      restored ?? {
        selectedStore: DEFAULT_SELECTED_STORE,
        language: DEFAULT_LANGUAGE,
        screen: 'home',
        shifts: [],
        attendancePage: DEFAULT_ATTENDANCE_PAGE_STATE,
      }
    )
  } catch {
    return {
      selectedStore: DEFAULT_SELECTED_STORE,
      language: DEFAULT_LANGUAGE,
      screen: 'home',
      shifts: [],
      attendancePage: DEFAULT_ATTENDANCE_PAGE_STATE,
    }
  }
}

export function saveAppPersistence(state: AppPersistenceState) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(toStoredState(state)))
}
