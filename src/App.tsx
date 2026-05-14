import { useCallback, useEffect, useState } from 'react'
import './App.css'
import {
  ApiError,
  getHealth,
  loginDevice,
} from './api/client'
import { useI18n } from './i18n/useI18n'
import { canUseNotifications } from './lib/pwa'
import {
  loadAppPersistence,
  saveAppPersistence,
} from './lib/storage'
import { syncOfflineQueue } from './lib/sync'
import AttendancePage from './pages/AttendancePage'
import DiagnosticsPage from './pages/DiagnosticsPage'
import HomePage from './pages/HomePage'
import InvoicePage from './pages/InvoicePage'
import LoginPage from './pages/LoginPage'
import PhotoReportPage from './pages/PhotoReportPage'
import SettingsPage from './pages/SettingsPage'
import StoreRequestsPage from './pages/StoreRequestsPage'
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

function App() {
  const [initialState] = useState(loadAppPersistence)
  const [screen, setScreen] = useState<Screen>(initialState.screen)
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
  const [notificationStatus, setNotificationStatus] = useState(
    canUseNotifications() ? Notification.permission : 'unsupported',
  )

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
          lastSyncMessage: 'Термінал активний',
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

  const handleLogout = useCallback(() => {
    setAuth({
      accessToken: null,
      deviceLogin: null,
      fullName: null,
    })
    setDevice((currentDevice) => ({
      ...currentDevice,
      id: null,
      deviceToken: null,
      status: null,
      login: null,
      storeId: null,
      storeCode: null,
      storeName: null,
      deviceName: null,
    }))
    setScreen('login')
  }, [])

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

  if (screen === 'attendance') {
    return (
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
  }

  if (screen === 'settings') {
    return (
      <SettingsPage
        notificationStatus={notificationStatus}
        t={t}
        onNotificationStatusChange={setNotificationStatus}
        onBack={() => setScreen('home')}
        onOpenDiagnostics={() => setScreen('diagnostics')}
      />
    )
  }

  if (screen === 'storeRequests') {
    return (
      <StoreRequestsPage
        device={device}
        entry={storeRequestEntry}
        t={t}
        onBack={() => setScreen('home')}
      />
    )
  }

  if (screen === 'diagnostics') {
    return (
      <DiagnosticsPage
        auth={auth}
        device={device}
        queueLength={offlineQueue.length}
        sync={sync}
        t={t}
        onBack={() => setScreen('home')}
        onCheckApi={checkApiStatus}
        onSync={runQueueSync}
        onLogout={handleLogout}
      />
    )
  }

  if (screen === 'invoice') {
    return <InvoicePage device={device} t={t} onBack={() => setScreen('home')} />
  }

  if (screen === 'photoReport') {
    return <PhotoReportPage device={device} t={t} onBack={() => setScreen('home')} />
  }

  return (
    <HomePage
      openShiftCount={openShifts.length}
      storeName={device.storeName}
      language={language}
      t={t}
      onLanguageChange={setLanguage}
      onOpenAttendance={() => setScreen('attendance')}
      onOpenStoreRequests={() => {
        setStoreRequestEntry('default')
        setScreen('storeRequests')
      }}
      onOpenInvoice={() => setScreen('invoice')}
      onOpenPhotoReport={() => setScreen('photoReport')}
      onOpenSettings={() => setScreen('settings')}
    />
  )
}

export default App
