import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { getHealth, getMe, login as loginRequest, registerDevice } from './api/client'
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
import LoginPage from './pages/LoginPage'
import SettingsPage from './pages/SettingsPage'
import type {
  AttendancePageState,
  AuthState,
  DeviceState,
  OfflineAttendanceEvent,
  Screen,
  Shift,
  SyncState,
} from './types/attendance'

function App() {
  const [initialState] = useState(loadAppPersistence)
  const [screen, setScreen] = useState<Screen>(initialState.screen)
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

  const ensureDeviceRegistered = useCallback(async () => {
    if (device.deviceToken) {
      return
    }

    const registeredDevice = await registerDevice(device.deviceUuid, selectedStore)
    setDevice({
      id: registeredDevice.id,
      deviceUuid: registeredDevice.device_uuid,
      deviceToken: registeredDevice.device_token,
      status: registeredDevice.status,
    })
    setSync((currentSync) => ({
      ...currentSync,
      apiStatus: 'online',
      lastSyncAt: new Date().toISOString(),
      lastSyncMessage: 'Device registered',
    }))
  }, [device.deviceToken, device.deviceUuid, selectedStore])

  const runQueueSync = useCallback(async () => {
    const result = await syncOfflineQueue(offlineQueue, device)
    setOfflineQueue(result.queue)
    setSync(result.sync)
  }, [device, offlineQueue])

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      setLoginPending(true)
      setLoginError('')

      try {
        const token = await loginRequest(email, password)
        const user = await getMe(token.access_token)

        setAuth({
          accessToken: token.access_token,
          email: user.email,
          fullName: user.full_name,
        })
        setScreen('home')
        try {
          await ensureDeviceRegistered()
        } catch {
          setSync((currentSync) => ({
            ...currentSync,
            apiStatus: 'offline',
            lastSyncAt: new Date().toISOString(),
            lastSyncMessage: 'Device registration failed',
          }))
        }
      } catch {
        setLoginError(t.auth.error)
      } finally {
        setLoginPending(false)
      }
    },
    [ensureDeviceRegistered, t.auth.error],
  )

  const handleLogout = useCallback(() => {
    setAuth({
      accessToken: null,
      email: null,
      fullName: null,
    })
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

  if (!auth.accessToken || screen === 'login') {
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
        onRegisterDevice={ensureDeviceRegistered}
        onSync={runQueueSync}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <HomePage
      openShiftCount={openShifts.length}
      language={language}
      t={t}
      onLanguageChange={setLanguage}
      onOpenAttendance={() => setScreen('attendance')}
      onOpenSettings={() => setScreen('settings')}
      onOpenDiagnostics={() => setScreen('diagnostics')}
    />
  )
}

export default App
