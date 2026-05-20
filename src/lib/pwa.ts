import type { Translation } from '../i18n/translations'
import { getPushPublicKey, registerPushSubscription, sendPushTest } from '../api/client'

export function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    ('standalone' in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

export function canUseNotifications() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function requestNotificationPermission() {
  if (!canUseNotifications()) {
    return 'unsupported'
  }

  const permission = await Notification.requestPermission()
  return permission
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null) {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function enablePushNotifications(deviceToken: string) {
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    return permission
  }

  const { public_key: publicKey } = await getPushPublicKey()
  if (!publicKey) {
    return 'not_configured'
  }

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))
  const json = subscription.toJSON()

  await registerPushSubscription(deviceToken, {
    endpoint: json.endpoint ?? subscription.endpoint,
    p256dh: arrayBufferToBase64Url(subscription.getKey('p256dh')),
    auth: arrayBufferToBase64Url(subscription.getKey('auth')),
    user_agent: navigator.userAgent,
  })

  return 'granted'
}

export async function sendBackendTestNotification(deviceToken: string) {
  const response = await sendPushTest(deviceToken)
  if (!response.ok) {
    throw new Error(response.reason || 'push_test_failed')
  }
  return response
}

export function showTestNotification(messages: Translation['pwa']) {
  if (!canUseNotifications()) {
    alert(messages.unsupportedNotifications)
    return
  }

  if (Notification.permission !== 'granted') {
    alert(messages.enableNotificationsFirst)
    return
  }

  new Notification('Promin Store', {
    body: messages.testNotificationBody,
    icon: '/icons/icon-192.png',
  })
}
