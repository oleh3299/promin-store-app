import type { Translation } from '../i18n/translations'
import type { AuthState, DeviceState, SyncState } from '../types/attendance'

type DiagnosticsPageProps = {
  auth: AuthState
  device: DeviceState
  queueLength: number
  sync: SyncState
  t: Translation
  onBack: () => void
  onCheckApi: () => Promise<void>
  onSync: () => Promise<void>
  onLogout: () => void
}

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.0.0'

function getApiStatusLabel(t: Translation, status: SyncState['apiStatus']) {
  if (status === 'online') return t.common.online
  if (status === 'offline') return t.common.offline
  return t.common.unknown
}

function DiagnosticsPage({
  auth,
  device,
  queueLength,
  sync,
  t,
  onBack,
  onCheckApi,
  onSync,
  onLogout,
}: DiagnosticsPageProps) {
  return (
    <main className="app-shell">
      <button className="back-button" onClick={onBack}>
        {t.diagnostics.back}
      </button>

      <section className="app-header vertical">
        <p className="app-kicker">{t.diagnostics.kicker}</p>
        <h1>{t.diagnostics.title}</h1>
        <p className="app-subtitle">{t.diagnostics.subtitle}</p>
      </section>

      <section className="panel diagnostic-list">
        <div className="diagnostic-row">
          <span>{t.diagnostics.apiStatus}</span>
          <strong>{getApiStatusLabel(t, sync.apiStatus)}</strong>
        </div>
        <button className="wide-button secondary" onClick={onCheckApi}>
          {t.diagnostics.checkApi}
        </button>
      </section>

      <section className="panel diagnostic-list">
        <div className="diagnostic-row">
          <span>{t.diagnostics.deviceLogin}</span>
          <strong>
            {auth.deviceLogin
              ? `${t.diagnostics.devicePrefix}: ${auth.deviceLogin}`
              : t.diagnostics.signedOut}
          </strong>
        </div>
        <div className="diagnostic-row">
          <span>{t.diagnostics.store}</span>
          <strong>{device.storeName ?? device.storeCode ?? t.common.unknown}</strong>
        </div>
        <button className="wide-button secondary" onClick={onLogout}>
          {t.auth.logout}
        </button>
      </section>

      <section className="panel diagnostic-list">
        <div className="diagnostic-row">
          <span>{t.diagnostics.queue}</span>
          <strong>{t.diagnostics.queueItems(queueLength)}</strong>
        </div>
        <div className="diagnostic-row">
          <span>{t.diagnostics.lastSync}</span>
          <strong>{sync.lastSyncAt ?? t.common.unknown}</strong>
        </div>
        <div className="diagnostic-row">
          <span>{t.diagnostics.appVersion}</span>
          <strong>{APP_VERSION}</strong>
        </div>
        <button className="wide-button" onClick={onSync}>
          {t.diagnostics.syncNow}
        </button>
      </section>
    </main>
  )
}

export default DiagnosticsPage
