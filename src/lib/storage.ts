import { languageCodes, type Language } from '../i18n/translations'
import type {
  AttendanceMode,
  AttendancePageState,
  AuthState,
  DeviceState,
  InputMethod,
  OfflineAttendanceEvent,
  Position,
  Screen,
  Shift,
  SyncState,
} from '../types/attendance'

const STORAGE_KEY = 'promin-store-attendance-state'
const STORAGE_VERSION = 1

export const DEFAULT_SELECTED_STORE = 'M37'
export const DEFAULT_LANGUAGE: Language = 'uk'

export const DEFAULT_ATTENDANCE_PAGE_STATE: AttendancePageState = {
  mode: null,
  inputMethod: null,
  employeeCode: '',
  selectedEmployeeId: null,
  selectedPosition: null,
}

export const DEFAULT_AUTH_STATE: AuthState = {
  accessToken: null,
  deviceLogin: null,
  fullName: null,
}

export const DEFAULT_DEVICE_STATE: DeviceState = {
  id: null,
  deviceUuid: '',
  deviceToken: null,
  status: null,
  login: null,
  storeId: null,
  storeCode: null,
  storeName: null,
  deviceName: null,
}

export const DEFAULT_SYNC_STATE: SyncState = {
  apiStatus: 'unknown',
  lastSyncAt: null,
  lastSyncMessage: null,
}

export type AppPersistenceState = {
  selectedStore: string
  language: Language
  screen: Screen
  shifts: Shift[]
  attendancePage: AttendancePageState
  auth: AuthState
  device: DeviceState
  offlineQueue: OfflineAttendanceEvent[]
  sync: SyncState
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
  auth?: AuthState
  device?: DeviceState
  offlineQueue?: OfflineAttendanceEvent[]
  sync?: SyncState
}

const validModes: AttendanceMode[] = ['checkin', 'checkout', null]
const validInputMethods: InputMethod[] = ['scan', 'manual', null]
const validPositions: Position[] = [
  'Ревізор',
  'Викладка / мерчендайзер',
  'Продавець',
]

const legacyPositionMap: Record<string, Position> = {
  'Р РµРІС–Р·РѕСЂ': 'Ревізор',
  'Р’РёРєР»Р°РґРєР° / РјРµСЂС‡РµРЅРґР°Р№Р·РµСЂ':
    'Викладка / мерчендайзер',
  'РџСЂРѕРґР°РІРµС†СЊ': 'Продавець',
}

const legacyStoreMap: Record<string, string> = {
  'Рњ37': 'M37',
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isScreen(value: unknown): value is Screen {
  return (
    value === 'home' ||
    value === 'attendance' ||
    value === 'settings' ||
    value === 'login' ||
    value === 'diagnostics' ||
    value === 'storeRequests' ||
    value === 'invoice' ||
    value === 'photoReport' ||
    value === 'planograms' ||
    value === 'storeTasks' ||
    value === 'scanner' ||
    value === 'profile'
  )
}

function isLanguage(value: unknown): value is Language {
  return languageCodes.includes(value as Language)
}

function normalizePosition(value: unknown): Position | null {
  if (validPositions.includes(value as Position)) {
    return value as Position
  }

  if (typeof value === 'string') {
    return legacyPositionMap[value] ?? null
  }

  return null
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

function normalizeStoreCode(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return DEFAULT_SELECTED_STORE
  }

  return legacyStoreMap[value] ?? value
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
    selectedPosition: normalizePosition(value.selectedPosition),
  }
}

function normalizeAuthState(value: unknown): AuthState {
  if (!isObject(value)) {
    return DEFAULT_AUTH_STATE
  }

  return {
    accessToken: typeof value.accessToken === 'string' ? value.accessToken : null,
    deviceLogin:
      typeof value.deviceLogin === 'string'
        ? value.deviceLogin
        : null,
    fullName: typeof value.fullName === 'string' ? value.fullName : null,
  }
}

function createDeviceUuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeDeviceState(value: unknown): DeviceState {
  if (!isObject(value)) {
    return { ...DEFAULT_DEVICE_STATE, deviceUuid: createDeviceUuid() }
  }

  return {
    id: typeof value.id === 'number' ? value.id : null,
    deviceUuid:
      typeof value.deviceUuid === 'string' && value.deviceUuid
        ? value.deviceUuid
        : createDeviceUuid(),
    deviceToken: typeof value.deviceToken === 'string' ? value.deviceToken : null,
    status: typeof value.status === 'string' ? value.status : null,
    login: typeof value.login === 'string' ? value.login : null,
    storeId: typeof value.storeId === 'number' ? value.storeId : null,
    storeCode: typeof value.storeCode === 'string' ? value.storeCode : null,
    storeName: typeof value.storeName === 'string' ? value.storeName : null,
    deviceName: typeof value.deviceName === 'string' ? value.deviceName : null,
  }
}

function isOfflineAttendanceEvent(value: unknown): value is OfflineAttendanceEvent {
  if (!isObject(value)) return false

  return (
    typeof value.id === 'string' &&
    (value.type === 'checkin' || value.type === 'checkout') &&
    typeof value.employeeId === 'string' &&
    (value.employeeBackendId === undefined ||
      typeof value.employeeBackendId === 'number') &&
    typeof value.employeeCode === 'string' &&
    typeof value.employeeName === 'string' &&
    (value.position === undefined || normalizePosition(value.position) !== null) &&
    typeof value.eventTime === 'string'
  )
}

function normalizeOfflineQueue(value: unknown): OfflineAttendanceEvent[] {
  if (!Array.isArray(value)) return []

  return value.filter(isOfflineAttendanceEvent).map((event) => ({
    ...event,
    position: event.position ? normalizePosition(event.position) ?? undefined : undefined,
  }))
}

function normalizeSyncState(value: unknown): SyncState {
  if (!isObject(value)) {
    return DEFAULT_SYNC_STATE
  }

  return {
    apiStatus:
      value.apiStatus === 'online' || value.apiStatus === 'offline'
        ? value.apiStatus
        : 'unknown',
    lastSyncAt: typeof value.lastSyncAt === 'string' ? value.lastSyncAt : null,
    lastSyncMessage:
      typeof value.lastSyncMessage === 'string' ? value.lastSyncMessage : null,
  }
}

function isShift(value: unknown): value is Shift {
  if (!isObject(value)) return false

  return (
    typeof value.employeeId === 'string' &&
    typeof value.employeeName === 'string' &&
    normalizePosition(value.position) !== null &&
    typeof value.checkInTime === 'string' &&
    (value.checkOutTime === undefined || typeof value.checkOutTime === 'string')
  )
}

function normalizeShifts(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter(isShift).map((shift) => ({
    ...shift,
    position: normalizePosition(shift.position) ?? 'Продавець',
  }))
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
    auth: state.auth,
    device: state.device,
    offlineQueue: state.offlineQueue,
    sync: state.sync,
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
    selectedStore: normalizeStoreCode(value.selectedStore),
    language: isLanguage(value.selectedLanguage)
      ? value.selectedLanguage
      : DEFAULT_LANGUAGE,
    screen: isScreen(appState.screen) ? appState.screen : 'home',
    shifts: [...openShifts, ...history],
    attendancePage: normalizeAttendancePageState(appState.attendancePage),
    auth: normalizeAuthState(value.auth),
    device: normalizeDeviceState(value.device),
    offlineQueue: normalizeOfflineQueue(value.offlineQueue),
    sync: normalizeSyncState(value.sync),
  }
}

function defaultPersistenceState(): AppPersistenceState {
  return {
    selectedStore: DEFAULT_SELECTED_STORE,
    language: DEFAULT_LANGUAGE,
    screen: 'home',
    shifts: [],
    attendancePage: DEFAULT_ATTENDANCE_PAGE_STATE,
    auth: DEFAULT_AUTH_STATE,
    device: { ...DEFAULT_DEVICE_STATE, deviceUuid: createDeviceUuid() },
    offlineQueue: [],
    sync: DEFAULT_SYNC_STATE,
  }
}

export function loadAppPersistence(): AppPersistenceState {
  const storage = getStorage()

  if (!storage) {
    return defaultPersistenceState()
  }

  try {
    const stored = storage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : null
    const restored = fromStoredState(parsed)

    return restored ?? defaultPersistenceState()
  } catch {
    return defaultPersistenceState()
  }
}

export function saveAppPersistence(state: AppPersistenceState) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(toStoredState(state)))
}

export function resetStoredScreen(screen: Screen = 'home') {
  const storage = getStorage()

  if (!storage) {
    return
  }

  try {
    const stored = storage.getItem(STORAGE_KEY)
    if (!stored) return

    const parsed = JSON.parse(stored)
    if (!isObject(parsed)) return

    const appState = isObject(parsed.appState) ? parsed.appState : {}
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...parsed,
        appState: {
          ...appState,
          screen,
          attendancePage: DEFAULT_ATTENDANCE_PAGE_STATE,
        },
      }),
    )
  } catch (error) {
    console.error('Failed to reset stored screen after app crash', { error })
  }
}
