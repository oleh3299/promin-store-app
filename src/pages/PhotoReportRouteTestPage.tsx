import { useState } from 'react'
import { ApiError, sendPhotoReportRouteTest } from '../api/client'
import type { DeviceState } from '../types/attendance'

type PhotoReportRouteTestPageProps = {
  device: DeviceState
  onBack: () => void
}

function PhotoReportRouteTestPage({ device, onBack }: PhotoReportRouteTestPageProps) {
  const [statusMessage, setStatusMessage] = useState('')
  const [roomName, setRoomName] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const timestamp = new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Uzhgorod',
  }).format(new Date())

  const sendTest = async () => {
    if (!device.deviceToken || isSending) return
    if (!navigator.onLine) {
      setStatusMessage('Немає зв’язку з сервером')
      return
    }

    setIsSending(true)
    setStatusMessage('')
    try {
      const response = await sendPhotoReportRouteTest(device.deviceToken)
      setRoomName(response.room_name)
      setRoomId(response.room_id)
      setStatusMessage('Тест надіслано')
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setStatusMessage('Маршрут photo_report для цього магазину не налаштований')
      } else if (error instanceof ApiError) {
        setStatusMessage(error.message || 'Не вдалося надіслати тест')
      } else {
        setStatusMessage('Немає зв’язку з сервером')
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="app-shell">
      <button className="back-button" onClick={onBack}>
        Назад
      </button>

      <section className="app-header vertical">
        <p className="app-kicker">Діагностика</p>
        <h1>Тест контуру фотозвіту</h1>
        <p className="app-subtitle">Перевірка каналу photo-reports без заміни робочого фотозвіту.</p>
      </section>

      {statusMessage && <div className="message-box">{statusMessage}</div>}

      <section className="panel diagnostic-list">
        <div className="diagnostic-row">
          <span>Магазин</span>
          <strong>{device.storeName ?? device.storeCode ?? 'Не визначено'}</strong>
        </div>
        <div className="diagnostic-row">
          <span>route_key</span>
          <strong>photo_report</strong>
        </div>
        <div className="diagnostic-row">
          <span>room_name</span>
          <strong>{roomName ?? 'Буде визначено після тесту'}</strong>
        </div>
        <div className="diagnostic-row">
          <span>room_id</span>
          <strong>{roomId ?? 'Буде визначено після тесту'}</strong>
        </div>
        <div className="diagnostic-row">
          <span>Час тесту</span>
          <strong>{timestamp}</strong>
        </div>
      </section>

      <section className="panel">
        <h2>Надіслати тест</h2>
        <p className="app-subtitle">
          Повідомлення буде надіслано в активний Rocket.Chat маршрут photo_report для поточного магазину.
        </p>
        <button className="wide-button secondary" disabled={isSending} type="button" onClick={() => void sendTest()}>
          {isSending ? 'Надсилання' : 'Надіслати тест'}
        </button>
      </section>
    </main>
  )
}

export default PhotoReportRouteTestPage
