import type { Translation } from '../i18n/translations'
import BackButton from '../components/BackButton'
import {
  enablePushNotifications,
  isStandaloneMode,
  sendBackendTestNotification,
} from '../lib/pwa'

type SettingsPageProps = {
  notificationStatus: string
  deviceToken: string | null
  t: Translation
  onNotificationStatusChange: (status: string) => void
  onBack: () => void
  onOpenDiagnostics: () => void
}

function SettingsPage({
  notificationStatus,
  deviceToken,
  t,
  onNotificationStatusChange,
  onBack,
  onOpenDiagnostics,
}: SettingsPageProps) {
  return (
    <main className="app-shell">
      <BackButton label={t.settings.back} onBack={onBack} />

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
            if (!deviceToken) {
              onNotificationStatusChange('device_required')
              return
            }

            const result = await enablePushNotifications(deviceToken)
            onNotificationStatusChange(result)
          }}
        >
          {t.settings.allowNotifications}
        </button>

        <button
          className="wide-button secondary"
          onClick={async () => {
            if (!deviceToken) {
              onNotificationStatusChange('device_required')
              return
            }

            try {
              await sendBackendTestNotification(deviceToken)
              onNotificationStatusChange('Тестове сповіщення надіслано')
            } catch {
              onNotificationStatusChange('Не вдалося надіслати тест')
            }
          }}
        >
          {t.settings.testNotification}
        </button>

        <button className="wide-button secondary" onClick={onOpenDiagnostics}>
          {t.settings.diagnostics}
        </button>
      </section>
    </main>
  )
}

export default SettingsPage
