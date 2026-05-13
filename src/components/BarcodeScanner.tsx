import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import type { Translation } from '../i18n/translations'

type BarcodeScannerProps = {
  t: Translation['scanner']
  onScan: (code: string) => void
  onClose: () => void
}

function BarcodeScanner({ t, onScan, onClose }: BarcodeScannerProps) {
  const cameraErrorRef = useRef(t.cameraError)

  useEffect(() => {
    cameraErrorRef.current = t.cameraError
  }, [t.cameraError])

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
        alert(cameraErrorRef.current)
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
      <h2>{t.title}</h2>
      <p>{t.prompt}</p>

      <div id="barcode-reader" className="barcode-reader" />

      <button className="wide-button secondary" onClick={onClose}>
        {t.close}
      </button>
    </section>
  )
}

export default BarcodeScanner
