import { useEffect, useState } from 'react'
import { API_BASE_URL, ApiError, getPlanograms } from '../api/client'
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

const SERVER_UNAVAILABLE_MESSAGE = 'Немає зв’язку з сервером'

function planogramImageSrc(imageUrl: string) {
  return encodeURI(imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`)
}

function retryImageSrc(src: string, retryKey: number) {
  if (retryKey === 0) {
    return src
  }

  return `${src}${src.includes('?') ? '&' : '?'}retry=${retryKey}`
}

function PlanogramsPage({ device, t, onBack }: PlanogramsPageProps) {
  const [items, setItems] = useState<PlanogramItem[]>([])
  const [expandedItemIds, setExpandedItemIds] = useState<number[]>([])
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})
  const [imageRetryKeys, setImageRetryKeys] = useState<Record<number, number>>({})
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
      } catch (error) {
        if (!cancelled) {
          console.error('Planograms load failed', { error })
          setErrorMessage(error instanceof ApiError ? t.planograms.genericError : SERVER_UNAVAILABLE_MESSAGE)
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

  function toggleItem(itemId: number) {
    setExpandedItemIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((currentId) => currentId !== itemId)
        : [...currentIds, itemId],
    )
  }

  function retryImage(itemId: number) {
    setImageErrors((currentErrors) => ({ ...currentErrors, [itemId]: false }))
    setImageRetryKeys((currentKeys) => ({
      ...currentKeys,
      [itemId]: (currentKeys[itemId] ?? 0) + 1,
    }))
  }

  function renderImageFallback(item: PlanogramItem) {
    return (
      <div className="planogram-image-fallback">
        <span>Зображення не завантажилось</span>
        <button type="button" onClick={() => retryImage(item.id)}>
          Спробувати ще раз
        </button>
      </div>
    )
  }

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
        {items.map((item) => {
          const isExpanded = expandedItemIds.includes(item.id)
          const imageSrc = planogramImageSrc(item.image_url)
          const previewSrc = retryImageSrc(imageSrc, imageRetryKeys[item.id] ?? 0)
          const hasImageError = imageErrors[item.id] === true

          return (
            <article className="panel planogram-card" key={item.id}>
              <button
                className="planogram-card-toggle"
                type="button"
                aria-expanded={isExpanded}
                onClick={() => toggleItem(item.id)}
              >
                <span>{item.category_name}</span>
                {item.description && <small>{item.description}</small>}
                <time>{t.planograms.updatedAt(planogramDateFormatter.format(new Date(item.uploaded_at)))}</time>
                <strong>{isExpanded ? 'Закрити' : 'Відкрити'}</strong>
              </button>

              {isExpanded && (
                <div className="planogram-preview">
                  {hasImageError ? (
                    renderImageFallback(item)
                  ) : (
                    <button className="planogram-image-button" type="button" onClick={() => setSelectedItem(item)}>
                      <img
                        alt={item.category_name}
                        loading="lazy"
                        src={previewSrc}
                        onError={() => setImageErrors((currentErrors) => ({ ...currentErrors, [item.id]: true }))}
                      />
                    </button>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </section>

      {selectedItem && (
        <div className="planogram-viewer" role="dialog" aria-modal="true">
          <button type="button" onClick={() => setSelectedItem(null)}>
            {t.planograms.close}
          </button>
          {imageErrors[selectedItem.id] ? (
            renderImageFallback(selectedItem)
          ) : (
            <img
              alt={selectedItem.category_name}
              src={retryImageSrc(planogramImageSrc(selectedItem.image_url), imageRetryKeys[selectedItem.id] ?? 0)}
              onError={() =>
                setImageErrors((currentErrors) => ({ ...currentErrors, [selectedItem.id]: true }))
              }
            />
          )}
        </div>
      )}
    </main>
  )
}

export default PlanogramsPage
