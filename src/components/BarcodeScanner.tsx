import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import type { Translation } from '../i18n/translations'

type BarcodeScannerProps = {
  t: Translation['scanner']
  onScan: (code: string) => void | Promise<void>
  onClose: () => void
}

function BarcodeScanner({ t, onScan, onClose }: BarcodeScannerProps) {
  const cameraErrorRef = useRef(t.cameraError)

  useEffect(() => {
    cameraErrorRef.current = t.cameraError
  }, [t.cameraError])

  useEffect(() => {
    let scanner: Html5Qrcode | null = null
    let isStopping = false

    const stopScanner = async () => {
      if (!scanner || isStopping) return

      isStopping = true

      try {
        await scanner.stop()
      } catch (error) {
        console.debug('Scanner stop skipped or failed', { error })
      }

      try {
        await scanner.clear()
      } catch (error) {
        console.debug('Scanner clear skipped or failed', { error })
      }
    }

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
            if (isStopping) return

            const barcode = decodedText.trim()
            console.debug('Scanner result', { barcode })

            if (!barcode) {
              return
            }

            await stopScanner()
            await onScan(barcode)
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
      void stopScanner()
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
