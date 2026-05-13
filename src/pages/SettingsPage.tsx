import type { Translation } from '../i18n/translations'
import {
  isStandaloneMode,
  requestNotificationPermission,
  showTestNotification,
} from '../lib/pwa'

type SettingsPageProps = {
  notificationStatus: string
  t: Translation
  onNotificationStatusChange: (status: string) => void
  onBack: () => void
}

function SettingsPage({
  notificationStatus,
  t,
  onNotificationStatusChange,
  onBack,
}: SettingsPageProps) {
  return (
    <main className="app-shell">
      <button className="back-button" onClick={onBack}>
        {t.settings.back}
      </button>

      <section className="app-header vertical">
        <p className="app-kicker">{t.settings.kicker}</p>
        <h1>{t.settings.title}</h1>
        <p className="app-subtitle">{t.settings.subtitle}</p>
      </section>

      <section className="panel">
        <h2>{t.settings.appModeTitle}</h2>

        <div className="pwa-status">
          <span>{t.settings.modeLabel}</span>
          <strong>
            {isStandaloneMode() ? t.home.standaloneMode : t.home.browserMode}
          </strong>
        </div>

        <div className="pwa-status">
          <span>{t.settings.pushLabel}</span>
          <strong>{notificationStatus}</strong>
        </div>

        <button
          className="wide-button"
          onClick={async () => {
            const result = await requestNotificationPermission()
            onNotificationStatusChange(result)
          }}
        >
          {t.settings.allowNotifications}
        </button>

        <button
          className="wide-button secondary"
          onClick={() => showTestNotification(t.pwa)}
        >
          {t.settings.testNotification}
        </button>
      </section>
    </main>
  )
}

export default SettingsPage
