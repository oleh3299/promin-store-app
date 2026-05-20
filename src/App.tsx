import { useCallback, useEffect, useState } from 'react'
import './App.css'
import {
  ApiError,
  DEVICE_DISABLED_EVENT,
  getHealth,
  getStoreTasks,
  loginDevice,
} from './api/client'
import { useI18n } from './i18n/useI18n'
import {
  DEFAULT_ATTENDANCE_PAGE_STATE,
  DEFAULT_AUTH_STATE,
  DEFAULT_DEVICE_STATE,
  loadAppPersistence,
  saveAppPersistence,
} from './lib/storage'
import AttendancePage from './pages/AttendancePage'
import HomePage from './pages/HomePage'
import InvoicePage from './pages/InvoicePage'
import LoginPage from './pages/LoginPage'
import PlanogramsPage from './pages/PlanogramsPage'
import PhotoReportRouteTestPage from './pages/PhotoReportRouteTestPage'
import PhotoReportPage from './pages/PhotoReportPage'
import DiagnosticsPage from './pages/DiagnosticsPage'
import SettingsPage from './pages/SettingsPage'
import StoreRequestsPage from './pages/StoreRequestsPage'
import StoreTasksPage from './pages/StoreTasksPage'
import HRTabletApp from './hr/HRTabletApp'
import type {
  AttendancePageState,
  AuthState,
  DeviceState,
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
  'photoReport',
  'photoReportRouteTest',
  'planograms',
  'storeTasks',
  'settings',
  'diagnostics',
  'login',
]

const DEVICE_BLOCKED_MESSAGE =
  'Пристрій заблоковано. Зверніться до адміністратора.'

function StoreApp() {
  const [initialState] = useState(loadAppPersistence)
  const initialOpenTarget =
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('open')
  const [screen, setScreen] = useState<Screen>(
    initialOpenTarget === 'messages' || initialOpenTarget === 'photo-tasks'
      ? 'storeTasks'
      : operationalScreens.includes(initialState.screen) ? initialState.screen : 'home',
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
  const [sync, setSync] = useState<SyncState>(initialState.sync)
  const [loginError, setLoginError] = useState('')
  const [loginPending, setLoginPending] = useState(false)
  const [deviceBlocked, setDeviceBlocked] = useState(false)
  const [incomingMessageCount, setIncomingMessageCount] = useState(0)
  const [incomingPhotoTaskCount, setIncomingPhotoTaskCount] = useState(0)
  const [homeStatusMessage, setHomeStatusMessage] = useState<string | null>(null)
  const [storeTaskMode, setStoreTaskMode] = useState<'messages' | 'photoReport'>(
    initialOpenTarget === 'photo-tasks' ? 'photoReport' : 'messages',
  )
  const [notificationStatus, setNotificationStatus] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )

  const t = useI18n(language)
  const openShifts = shifts.filter((shift) => !shift.checkOutTime)

  const handleAttendancePageStateChange = useCallback(
    (state: AttendancePageState) => {
      setAttendancePageState(state)
    },
    [],
  )

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

  const loadIncomingMessageCount = useCallback(async () => {
    if (!device.deviceToken) {
      setIncomingMessageCount(0)
      return
    }

    try {
      const response = await getStoreTasks(device.deviceToken, 'open,new')
      setIncomingMessageCount(response.items.filter((task) => task.source === 'rocket_chat' && task.category !== 'photo_report').length)
      setIncomingPhotoTaskCount(response.items.filter((task) => task.source === 'rocket_chat' && task.category === 'photo_report').length)
    } catch {
      setIncomingMessageCount(0)
      setIncomingPhotoTaskCount(0)
    }
  }, [device.deviceToken])

  const clearDeviceSession = useCallback(() => {
    setAuth(DEFAULT_AUTH_STATE)
    setDevice((currentDevice) => ({
      ...DEFAULT_DEVICE_STATE,
      deviceUuid: currentDevice.deviceUuid || DEFAULT_DEVICE_STATE.deviceUuid,
    }))
    setShifts([])
    setAttendancePageState(DEFAULT_ATTENDANCE_PAGE_STATE)
    setScreen('home')
    setSync({
      apiStatus: 'unknown',
      lastSyncAt: new Date().toISOString(),
      lastSyncMessage: 'Device disabled',
    })
  }, [])

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
        setDeviceBlocked(false)
        setScreen('home')
        setSync((currentSync) => ({
          ...currentSync,
          apiStatus: 'online',
          lastSyncAt: new Date().toISOString(),
          lastSyncMessage: 'РўРµСЂРјС–РЅР°Р» Р°РєС‚РёРІРЅРёР№',
        }))
      } catch (error) {
        if (error instanceof ApiError && error.status === 403 && error.message === 'Device disabled') {
          clearDeviceSession()
          setDeviceBlocked(true)
          setLoginError('')
          return
        }

        setLoginError(t.auth.invalidCredentials)
      } finally {
        setLoginPending(false)
      }
    },
    [clearDeviceSession, t.auth.invalidCredentials],
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
      offlineQueue: [],
      sync,
    })
  }, [
    attendancePageState,
    auth,
    device,
    language,
    screen,
    selectedStore,
    shifts,
    sync,
  ])

  useEffect(() => {
    void checkApiStatus()
  }, [checkApiStatus])

  useEffect(() => {
    if (screen === 'home') {
      void loadIncomingMessageCount()
    }
  }, [loadIncomingMessageCount, screen])

  useEffect(() => {
    const handleDeviceDisabled = () => {
      clearDeviceSession()
      setDeviceBlocked(true)
    }

    window.addEventListener(DEVICE_DISABLED_EVENT, handleDeviceDisabled)
    return () => window.removeEventListener(DEVICE_DISABLED_EVENT, handleDeviceDisabled)
  }, [clearDeviceSession])

  if (deviceBlocked) {
    return (
      <main className="app-shell blocked-device-screen">
        <section className="panel error-panel">
          <p className="app-kicker">PROMIN STORE</p>
          <h1>Пристрій заблоковано</h1>
          <p>{DEVICE_BLOCKED_MESSAGE}</p>
        </section>
      </main>
    )
  }

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
  } else if (screen === 'photoReport') {
    content = (
      <PhotoReportPage
        device={device}
        t={t}
        onBack={() => setScreen('home')}
        onCompleted={(message) => {
          setHomeStatusMessage(message)
          setScreen('home')
        }}
      />
    )
  } else if (screen === 'photoReportRouteTest') {
    content = <PhotoReportRouteTestPage device={device} onBack={() => setScreen('home')} />
  } else if (screen === 'planograms') {
    content = <PlanogramsPage device={device} t={t} onBack={() => setScreen('home')} />
  } else if (screen === 'storeTasks') {
    content = <StoreTasksPage device={device} mode={storeTaskMode} onBack={() => setScreen('home')} />
  } else if (screen === 'settings') {
    content = (
      <SettingsPage
        notificationStatus={notificationStatus}
        deviceToken={device.deviceToken}
        t={t}
        onNotificationStatusChange={setNotificationStatus}
        onBack={() => setScreen('home')}
        onOpenDiagnostics={() => setScreen('diagnostics')}
      />
    )
  } else if (screen === 'diagnostics') {
    content = (
      <DiagnosticsPage
        auth={auth}
        device={device}
        queueLength={0}
        sync={sync}
        t={t}
        onBack={() => setScreen('settings')}
        onCheckApi={checkApiStatus}
        onSync={checkApiStatus}
        onLogout={clearDeviceSession}
      />
    )
  } else {
    content = (
      <HomePage
        openShiftCount={openShifts.length}
        storeName={device.storeName}
        t={t}
        incomingMessageCount={incomingMessageCount}
        incomingPhotoTaskCount={incomingPhotoTaskCount}
        statusMessage={homeStatusMessage}
        onOpenStoreRequests={() => {
          setStoreRequestEntry('default')
          setScreen('storeRequests')
        }}
        onOpenInvoice={() => setScreen('invoice')}
        onOpenAttendance={() => setScreen('attendance')}
        onOpenPlanograms={() => setScreen('planograms')}
        onOpenPhotoReport={() => {
          setHomeStatusMessage(null)
          setScreen('photoReport')
        }}
        onOpenStoreTasks={() => {
          setStoreTaskMode('messages')
          setScreen('storeTasks')
        }}
        onOpenPhotoTasks={() => {
          setStoreTaskMode('photoReport')
          setScreen('storeTasks')
        }}
        onOpenSettings={() => setScreen('settings')}
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
