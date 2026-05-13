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

export function showTestNotification() {
  if (!canUseNotifications()) {
    alert('Уведомления не поддерживаются на этом устройстве')
    return
  }

  if (Notification.permission !== 'granted') {
    alert('Сначала разрешите уведомления')
    return
  }

  new Notification('Promin Store', {
    body: 'Тестовое уведомление сработает',
    icon: '/icons.svg',
  })
}
