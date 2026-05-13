import type { Translation } from '../i18n/translations'

export function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    ('standalone' in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

export function canUseNotifications() {
  return 'Notification' in window
}

export async function requestNotificationPermission() {
  if (!canUseNotifications()) {
    return 'unsupported'
  }

  const permission = await Notification.requestPermission()
  return permission
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
    icon: '/icons.svg',
  })
}
