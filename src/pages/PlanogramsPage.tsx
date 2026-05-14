import { useEffect, useState } from 'react'
import { API_BASE_URL, getPlanograms } from '../api/client'
import type { PlanogramItem } from '../api/types'
import type { Translation } from '../i18n/translations'
import type { DeviceState } from '../types/attendance'

type PlanogramsPageProps = {
  device: DeviceState
  t: Translation
  onBack: () => void
}

const planogramDateFormatter = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Uzhgorod',
})

function planogramImageSrc(imageUrl: string) {
  return imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`
}

function PlanogramsPage({ device, t, onBack }: PlanogramsPageProps) {
  const [items, setItems] = useState<PlanogramItem[]>([])
  const [selectedItem, setSelectedItem] = useState<PlanogramItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadPlanograms() {
      if (!device.deviceToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await getPlanograms(device.deviceToken)
        if (!cancelled) {
          setItems(response.items)
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(t.planograms.genericError)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPlanograms()

    return () => {
      cancelled = true
    }
  }, [device.deviceToken, t.planograms.genericError])

  return (
    <main className="app-shell">
      <button className="back-button" onClick={onBack}>
        {t.planograms.back}
      </button>

      <section className="app-header vertical">
        <p className="app-kicker">{t.planograms.kicker}</p>
        <h1>{t.planograms.title}</h1>
        <p className="app-subtitle">{t.planograms.subtitle}</p>
      </section>

      {errorMessage && <div className="message-box">{errorMessage}</div>}

      {!isLoading && items.length === 0 && (
        <section className="panel">
          <p className="empty-state">{t.planograms.empty}</p>
        </section>
      )}

      <section className="planogram-grid">
        {items.map((item) => (
          <button className="panel planogram-card" key={item.id} type="button" onClick={() => setSelectedItem(item)}>
            <img alt={item.category_name} src={planogramImageSrc(item.image_url)} />
            <span>{item.category_name}</span>
            {item.description && <small>{item.description}</small>}
            <time>{t.planograms.updatedAt(planogramDateFormatter.format(new Date(item.uploaded_at)))}</time>
          </button>
        ))}
      </section>

      {selectedItem && (
        <div className="planogram-viewer" role="dialog" aria-modal="true">
          <button type="button" onClick={() => setSelectedItem(null)}>
            {t.planograms.close}
          </button>
          <img alt={selectedItem.category_name} src={planogramImageSrc(selectedItem.image_url)} />
        </div>
      )}
    </main>
  )
}

export default PlanogramsPage
