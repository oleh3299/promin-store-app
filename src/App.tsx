import { useCallback, useEffect, useState } from 'react'
import './App.css'
import {
  ApiError,
  getHealth,
  loginDevice,
} from './api/client'
import { useI18n } from './i18n/useI18n'
import {
  loadAppPersistence,
  saveAppPersistence,
} from './lib/storage'
import { syncOfflineQueue } from './lib/sync'
import AttendancePage from './pages/AttendancePage'
import HomePage from './pages/HomePage'
import InvoicePage from './pages/InvoicePage'
import LoginPage from './pages/LoginPage'
import PlanogramsPage from './pages/PlanogramsPage'
import StoreRequestsPage from './pages/StoreRequestsPage'
import HRTabletApp from './hr/HRTabletApp'
import type {
  AttendancePageState,
  AuthState,
  DeviceState,
  OfflineAttendanceEvent,
  Screen,
  Shift,
  StoreRequestEntry,
  SyncState,
} from './types/attendance'

const operationalScreens: Screen[] = [
  'home',
  'attendance',
  'storeRequests',
  'invoice',
  'planograms',
  'login',
]

function StoreApp() {
  const [initialState] = useState(loadAppPersistence)
  const [screen, setScreen] = useState<Screen>(
    operationalScreens.includes(initialState.screen) ? initialState.screen : 'home',
  )
  const [storeRequestEntry, setStoreRequestEntry] =
    useState<StoreRequestEntry>('default')
  const [selectedStore] = useState(initialState.selectedStore)
  const [language, setLanguage] = useState(initialState.language)
  const [shifts, setShifts] = useState<Shift[]>(initialState.shifts)
  const [attendancePageState, setAttendancePageState] =
    useState<AttendancePageState>(initialState.attendancePage)
  const [auth, setAuth] = useState<AuthState>(initialState.auth)
  const [device, setDevice] = useState<DeviceState>(initialState.device)
  const [offlineQueue, setOfflineQueue] = useState<OfflineAttendanceEvent[]>(
    initialState.offlineQueue,
  )
  const [sync, setSync] = useState<SyncState>(initialState.sync)
  const [loginError, setLoginError] = useState('')
  const [loginPending, setLoginPending] = useState(false)

  const t = useI18n(language)
  const openShifts = shifts.filter((shift) => !shift.checkOutTime)

  const handleAttendancePageStateChange = useCallback(
    (state: AttendancePageState) => {
      setAttendancePageState(state)
    },
    [],
  )

  const queueAttendanceEvent = useCallback((event: OfflineAttendanceEvent) => {
    setOfflineQueue((currentQueue) => {
      if (currentQueue.some((item) => item.id === event.id)) {
        return currentQueue
      }

      return [...currentQueue, event]
    })
  }, [])

  const checkApiStatus = useCallback(async () => {
    try {
      await getHealth()
      setSync((currentSync) => ({
        ...currentSync,
        apiStatus: 'online',
        lastSyncAt: new Date().toISOString(),
        lastSyncMessage: 'API OK',
      }))
    } catch {
      setSync((currentSync) => ({
        ...currentSync,
        apiStatus: 'offline',
        lastSyncAt: new Date().toISOString(),
        lastSyncMessage: 'API unavailable',
      }))
    }
  }, [])

  const runQueueSync = useCallback(async () => {
    const result = await syncOfflineQueue(offlineQueue, device)
    setOfflineQueue(result.queue)
    setSync(result.sync)
  }, [device, offlineQueue])

  const handleLogin = useCallback(
    async (deviceLogin: string, password: string) => {
      setLoginPending(true)
      setLoginError('')

      try {
        const response = await loginDevice(deviceLogin, password)
        setDevice((currentDevice) => ({
          ...currentDevice,
          id: response.device.id,
          deviceToken: response.device_token,
          status: 'active',
          login: deviceLogin.trim().toLowerCase(),
          storeId: response.device.store_id,
          storeCode: response.device.store_code,
          storeName: response.device.store_name,
          deviceName: response.device.device_name,
        }))
        setAuth({
          accessToken: null,
          deviceLogin: deviceLogin.trim().toLowerCase(),
          fullName: response.device.device_name,
        })
        setScreen('home')
        setSync((currentSync) => ({
          ...currentSync,
          apiStatus: 'online',
          lastSyncAt: new Date().toISOString(),
          lastSyncMessage: 'РўРµСЂРјС–РЅР°Р» Р°РєС‚РёРІРЅРёР№',
        }))
      } catch (error) {
        setLoginError(
          error instanceof ApiError && error.status === 403
            ? t.auth.disabledDevice
            : t.auth.invalidCredentials,
        )
      } finally {
        setLoginPending(false)
      }
    },
    [t.auth.disabledDevice, t.auth.invalidCredentials],
  )

  useEffect(() => {
    saveAppPersistence({
      selectedStore,
      language,
      screen,
      shifts,
      attendancePage: attendancePageState,
      auth,
      device,
      offlineQueue,
      sync,
    })
  }, [
    attendancePageState,
    auth,
    device,
    language,
    offlineQueue,
    screen,
    selectedStore,
    shifts,
    sync,
  ])

  useEffect(() => {
    void checkApiStatus()
  }, [checkApiStatus])

  useEffect(() => {
    if (!navigator.onLine || offlineQueue.length === 0) {
      return
    }

    void runQueueSync()
  }, [offlineQueue.length, runQueueSync])

  useEffect(() => {
    const handleOnline = () => {
      void runQueueSync()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [runQueueSync])

  if (!device.deviceToken || screen === 'login') {
    return (
      <LoginPage
        error={loginError}
        isSubmitting={loginPending}
        language={language}
        t={t}
        onLanguageChange={setLanguage}
        onLogin={handleLogin}
      />
    )
  }

  let content

  if (screen === 'attendance') {
    content = (
      <AttendancePage
        device={device}
        initialState={attendancePageState}
        openShifts={openShifts}
        shifts={shifts}
        setShifts={setShifts}
        t={t}
        onQueueEvent={queueAttendanceEvent}
        onSyncStateChange={setSync}
        onStateChange={handleAttendancePageStateChange}
        onBack={() => setScreen('home')}
      />
    )
  } else if (screen === 'storeRequests') {
    content = (
      <StoreRequestsPage
        device={device}
        entry={storeRequestEntry}
        t={t}
        onBack={() => setScreen('home')}
      />
    )
  } else if (screen === 'invoice') {
    content = <InvoicePage device={device} t={t} onBack={() => setScreen('home')} />
  } else if (screen === 'planograms') {
    content = <PlanogramsPage device={device} t={t} onBack={() => setScreen('home')} />
  } else {
    content = (
      <HomePage
        openShiftCount={openShifts.length}
        storeName={device.storeName}
        t={t}
        onOpenStoreRequests={() => {
          setStoreRequestEntry('default')
          setScreen('storeRequests')
        }}
        onOpenInvoice={() => setScreen('invoice')}
        onOpenAttendance={() => setScreen('attendance')}
        onOpenPlanograms={() => setScreen('planograms')}
      />
    )
  }

  return content
}

function App() {
  if (window.location.pathname.startsWith('/hr')) {
    return <HRTabletApp />
  }

  return <StoreApp />
}

export default App
