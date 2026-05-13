import { useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type BarcodeScannerProps = {
  onScan: (code: string) => void
  onClose: () => void
}

function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  useEffect(() => {
    let scanner: Html5Qrcode | null = null
    let isStopped = false

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('barcode-reader')

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: {
              width: 260,
              height: 260,
            },
          },
          async (decodedText) => {
            if (isStopped) return

            isStopped = true
            onScan(decodedText)

            try {
              await scanner?.stop()
              await scanner?.clear()
            } catch {
              // ignore
            }
          },
          () => {
            // scan errors are normal while camera is searching
          },
        )
      } catch (error) {
        console.error('Camera start error:', error)
        alert('Не удалось запустить камеру. Проверьте разрешение камеры.')
      }
    }

    startScanner()

    return () => {
      isStopped = true

      if (scanner) {
        scanner
          .stop()
          .then(() => scanner?.clear())
          .catch(() => {
            // already stopped
          })
      }
    }
  }, [onScan])

  return (
    <section className="panel scanner-panel">
      <h2>Сканування штрихкоду</h2>
      <p>Наведіть камеру на бейдж співробітника.</p>

      <div id="barcode-reader" className="barcode-reader" />

      <button className="wide-button secondary" onClick={onClose}>
        Закрити сканер
      </button>
    </section>
  )
}

export default BarcodeScanner
