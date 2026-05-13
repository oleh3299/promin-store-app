import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import type { Translation } from '../i18n/translations'
import {
  isValidEmployeeBarcode,
  normalizeEmployeeBarcode,
} from '../lib/barcode'

type BarcodeScannerProps = {
  t: Translation['scanner']
  onScan: (code: string) => void | Promise<void>
  onClose: () => void
  onManualEntry: () => void
}

const SAME_RESULT_COOLDOWN_MS = 2500

function BarcodeScanner({ t, onScan, onClose, onManualEntry }: BarcodeScannerProps) {
  const [pendingCode, setPendingCode] = useState('')
  const [scanMessage, setScanMessage] = useState('')
  const [scanSession, setScanSession] = useState(0)
  const cameraErrorRef = useRef(t.cameraError)
  const onScanRef = useRef(onScan)
  const lastResultRef = useRef<{ value: string; time: number } | null>(null)

  useEffect(() => {
    cameraErrorRef.current = t.cameraError
  }, [t.cameraError])

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    let scanner: Html5Qrcode | null = null
    let isStopping = false
    let scannerStarted = false

    const stopScanner = async () => {
      if (!scanner || isStopping || !scannerStarted) return

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

      scannerStarted = false
    }

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('barcode-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        })

        await scanner.start(
          {
            facingMode: {
              ideal: 'environment',
            },
          },
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => ({
              width: Math.floor(Math.min(viewfinderWidth * 0.9, 360)),
              height: Math.floor(
                Math.min(Math.max(viewfinderWidth * 0.28, 90), viewfinderHeight * 0.42),
              ),
            }),
            aspectRatio: 16 / 9,
            disableFlip: true,
            videoConstraints: {
              facingMode: {
                ideal: 'environment',
              },
              width: {
                ideal: 1280,
              },
              height: {
                ideal: 720,
              },
            },
          },
          async (decodedText) => {
            if (isStopping) return

            const barcode = normalizeEmployeeBarcode(decodedText)
            const now = Date.now()
            const lastResult = lastResultRef.current

            if (
              lastResult?.value === barcode &&
              now - lastResult.time < SAME_RESULT_COOLDOWN_MS
            ) {
              console.debug('Scanner result ignored', {
                scannedBarcode: barcode,
                reason: 'duplicate',
              })
              return
            }

            lastResultRef.current = {
              value: barcode,
              time: now,
            }

            console.debug('Scanner result', {
              rawValue: decodedText,
              barcode,
            })

            if (!isValidEmployeeBarcode(barcode)) {
              setScanMessage(t.invalidCode)
              return
            }

            await stopScanner()
            setPendingCode(barcode)
            setScanMessage('')
          },
          () => {
            // scan errors are normal while camera is searching
          },
        )
        scannerStarted = true
      } catch (error) {
        console.error('Camera start error:', error)
        alert(cameraErrorRef.current)
      }
    }

    startScanner()

    return () => {
      void stopScanner()
    }
  }, [scanSession, t.invalidCode])

  return (
    <section className="panel scanner-panel">
      <h2>{t.title}</h2>
      <p>{t.prompt}</p>
      <p className="scanner-hint">{t.holdHint}</p>

      {scanMessage && <div className="message-box">{scanMessage}</div>}

      {!pendingCode && (
        <div className="barcode-reader-wrapper">
          <div id="barcode-reader" className="barcode-reader" />
          <div className="scanner-guide" aria-hidden="true">
            <span>{t.frameLabel}</span>
          </div>
        </div>
      )}

      {pendingCode && (
        <div className="scan-confirmation">
          <span>{t.confirmCode}</span>
          <strong>{pendingCode}</strong>
          <button
            className="wide-button"
            onClick={() => void onScanRef.current(pendingCode)}
          >
            {t.confirm}
          </button>
          <button
            className="wide-button secondary"
            onClick={() => {
              setPendingCode('')
              setScanMessage('')
              setScanSession((session) => session + 1)
            }}
          >
            {t.scanAgain}
          </button>
        </div>
      )}

      <button className="wide-button secondary" onClick={onManualEntry}>
        {t.manualEntry}
      </button>

      <button className="wide-button secondary" onClick={onClose}>
        {t.close}
      </button>
    </section>
  )
}

export default BarcodeScanner
