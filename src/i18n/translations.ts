import type { Position } from '../types/attendance'

export const languageCodes = ['uk', 'ru', 'en'] as const

export type Language = (typeof languageCodes)[number]

export type Translation = {
  language: {
    label: string
    name: string
  }
  pwa: {
    unsupportedNotifications: string
    enableNotificationsFirst: string
    testNotificationBody: string
  }
  home: {
    title: string
    subtitle: string
    storeLabel: string
    today: string
    onShift: string
    activeDevice: string
    appTitle: string
    modeLabel: string
    standaloneMode: string
    browserMode: string
    allowNotifications: string
    testNotification: string
    inDevelopment: string
      menu: {
        attendance: string
        attendanceSubtitle: string
        settings: string
        settingsSubtitle: string
        currentShift: string
      tasks: string
      photoReports: string
      productScan: string
      priceTags: string
      openingControl: string
      itPanicButton: string
      shiftMetrics: string
    }
  }
  settings: {
    back: string
    kicker: string
    title: string
    subtitle: string
    appModeTitle: string
    modeLabel: string
    pushLabel: string
    allowNotifications: string
    testNotification: string
  }
  attendance: {
    back: string
    kicker: string
    title: string
    subtitle: string
    checkIn: string
    checkOut: string
    chooseMethod: string
    scanBarcode: string
    enterCodeManually: string
    cancel: string
    identifyEmployee: string
    openCamera: string
    testScan: string
    employeeCodePlaceholder: string
    findEmployee: string
    employeeFound: string
    codeLabel: string
    choosePosition: string
    confirmCheckIn: string
    confirmCheckOutTitle: string
    confirmCheckOutPrompt: string
    confirmCheckOut: string
    todayOnShift: string
    noOpenShifts: string
    checkInLabel: string
    messages: {
      employeeNotFound: string
      alreadyOpenShift: string
      openShiftNotFound: string
      shiftStarted: (name: string) => string
      shiftFinished: (name: string) => string
    }
  }
  scanner: {
    title: string
    prompt: string
    close: string
    cameraError: string
  }
  positions: Record<Position, string>
}

export const translations: Record<Language, Translation> = {
  uk: {
    language: {
      label: 'UA',
      name: 'Українська',
    },
    pwa: {
      unsupportedNotifications: 'Сповіщення не підтримуються на цьому пристрої',
      enableNotificationsFirst: 'Спочатку дозвольте сповіщення',
      testNotificationBody: 'Тестове сповіщення працює',
    },
    home: {
      title: 'Робоче місце магазину',
      subtitle:
        'Перший контур: табель співробітників. Інші модулі підключимо поетапно.',
      storeLabel: 'Магазин',
      today: 'Сьогодні',
      onShift: 'на зміні',
      activeDevice: 'Пристрій активний',
      appTitle: 'Застосунок',
      modeLabel: 'Режим',
      standaloneMode: 'Встановлено як застосунок',
      browserMode: 'Відкрито в браузері',
      allowNotifications: 'Дозволити сповіщення',
      testNotification: 'Тест сповіщення',
      inDevelopment: 'У розробці',
      menu: {
        attendance: 'Табель',
        attendanceSubtitle: 'Прихід / вихід співробітників',
        settings: 'Налаштування',
        settingsSubtitle: 'Застосунок і сповіщення',
        currentShift: 'Хто на зміні',
        tasks: 'Завдання',
        photoReports: 'Фотозвіти',
        productScan: 'Скан товару',
        priceTags: 'Друк цінників',
        openingControl: 'Контроль відкриття',
        itPanicButton: 'Тривожна кнопка IT',
        shiftMetrics: 'Показники зміни',
      },
    },
    settings: {
      back: '← Назад',
      kicker: 'Налаштування',
      title: 'Налаштування',
      subtitle: 'Стан застосунку та сповіщень.',
      appModeTitle: 'Застосунок',
      modeLabel: 'Режим',
      pushLabel: 'Push',
      allowNotifications: 'Дозволити сповіщення',
      testNotification: 'Тест сповіщення',
    },
    attendance: {
      back: '← Назад',
      kicker: 'Табель',
      title: 'Прихід / вихід',
      subtitle: 'Магазин уже авторизований. Співробітник відмічає тільки себе.',
      checkIn: 'Прихід',
      checkOut: 'Вихід',
      chooseMethod: 'Оберіть спосіб ідентифікації співробітника.',
      scanBarcode: 'Сканувати штрихкод',
      enterCodeManually: 'Ввести код вручну',
      cancel: 'Скасувати',
      identifyEmployee: 'Ідентифікація співробітника',
      openCamera: 'Відкрити камеру',
      testScan: 'Тестовий скан',
      employeeCodePlaceholder: 'Ідентифікаційний код',
      findEmployee: 'Знайти співробітника',
      employeeFound: 'Співробітника знайдено',
      codeLabel: 'Код',
      choosePosition: 'Оберіть посаду',
      confirmCheckIn: 'Підтвердити прихід',
      confirmCheckOutTitle: 'Підтвердження виходу',
      confirmCheckOutPrompt: 'Закрити зміну співробітника?',
      confirmCheckOut: 'Підтвердити вихід',
      todayOnShift: 'Сьогодні на зміні',
      noOpenShifts: 'Відкритих змін немає',
      checkInLabel: 'Прихід',
      messages: {
        employeeNotFound: 'Співробітника не знайдено',
        alreadyOpenShift: 'У співробітника вже відкрита зміна',
        openShiftNotFound: 'Відкрита зміна не знайдена',
        shiftStarted: (name) => `Зміну розпочато: ${name}`,
        shiftFinished: (name) => `Зміну завершено: ${name}`,
      },
    },
    scanner: {
      title: 'Сканування штрихкоду',
      prompt: 'Наведіть камеру на бейдж співробітника.',
      close: 'Закрити сканер',
      cameraError: 'Не вдалося запустити камеру. Перевірте дозвіл камери.',
    },
    positions: {
      Ревізор: 'Ревізор',
      'Викладка / мерчендайзер': 'Викладка / мерчендайзер',
      Продавець: 'Продавець',
    },
  },
  ru: {
    language: {
      label: 'RU',
      name: 'Русский',
    },
    pwa: {
      unsupportedNotifications: 'Уведомления не поддерживаются на этом устройстве',
      enableNotificationsFirst: 'Сначала разрешите уведомления',
      testNotificationBody: 'Тестовое уведомление сработает',
    },
    home: {
      title: 'Рабочее место магазина',
      subtitle:
        'Первый контур: табель сотрудников. Остальные модули подключим поэтапно.',
      storeLabel: 'Магазин',
      today: 'Сегодня',
      onShift: 'на смене',
      activeDevice: 'Устройство активно',
      appTitle: 'Приложение',
      modeLabel: 'Режим',
      standaloneMode: 'Установлено как приложение',
      browserMode: 'Открыто в браузере',
      allowNotifications: 'Разрешить уведомления',
      testNotification: 'Тест уведомления',
      inDevelopment: 'В разработке',
      menu: {
        attendance: 'Табель',
        attendanceSubtitle: 'Приход / уход сотрудников',
        settings: 'Настройки',
        settingsSubtitle: 'Приложение и уведомления',
        currentShift: 'Кто на смене',
        tasks: 'Задания',
        photoReports: 'Фотоотчёты',
        productScan: 'Скан товара',
        priceTags: 'Печать ценников',
        openingControl: 'Контроль открытия',
        itPanicButton: 'Тревожная кнопка IT',
        shiftMetrics: 'Показатели смены',
      },
    },
    settings: {
      back: '← Назад',
      kicker: 'Настройки',
      title: 'Настройки',
      subtitle: 'Состояние приложения и уведомлений.',
      appModeTitle: 'Приложение',
      modeLabel: 'Режим',
      pushLabel: 'Push',
      allowNotifications: 'Разрешить уведомления',
      testNotification: 'Тест уведомления',
    },
    attendance: {
      back: '← Назад',
      kicker: 'Табель',
      title: 'Приход / уход',
      subtitle: 'Магазин уже авторизован. Сотрудник отмечает только себя.',
      checkIn: 'Приход',
      checkOut: 'Уход',
      chooseMethod: 'Выберите способ идентификации сотрудника.',
      scanBarcode: 'Сканировать штрихкод',
      enterCodeManually: 'Ввести код вручную',
      cancel: 'Отмена',
      identifyEmployee: 'Идентификация сотрудника',
      openCamera: 'Открыть камеру',
      testScan: 'Тестовый скан',
      employeeCodePlaceholder: 'Идентификационный код',
      findEmployee: 'Найти сотрудника',
      employeeFound: 'Сотрудник найден',
      codeLabel: 'Код',
      choosePosition: 'Выберите должность',
      confirmCheckIn: 'Подтвердить приход',
      confirmCheckOutTitle: 'Подтверждение ухода',
      confirmCheckOutPrompt: 'Закрыть смену сотрудника?',
      confirmCheckOut: 'Подтвердить уход',
      todayOnShift: 'Сегодня на смене',
      noOpenShifts: 'Открытых смен нет',
      checkInLabel: 'Приход',
      messages: {
        employeeNotFound: 'Сотрудник не найден',
        alreadyOpenShift: 'У сотрудника уже открыта смена',
        openShiftNotFound: 'Открытая смена не найдена',
        shiftStarted: (name) => `Смена начата: ${name}`,
        shiftFinished: (name) => `Смена завершена: ${name}`,
      },
    },
    scanner: {
      title: 'Сканирование штрихкода',
      prompt: 'Наведите камеру на бейдж сотрудника.',
      close: 'Закрыть сканер',
      cameraError: 'Не удалось запустить камеру. Проверьте разрешение камеры.',
    },
    positions: {
      Ревізор: 'Ревизор',
      'Викладка / мерчендайзер': 'Выкладка / мерчендайзер',
      Продавець: 'Продавец',
    },
  },
  en: {
    language: {
      label: 'EN',
      name: 'English',
    },
    pwa: {
      unsupportedNotifications: 'Notifications are not supported on this device',
      enableNotificationsFirst: 'Allow notifications first',
      testNotificationBody: 'The test notification works',
    },
    home: {
      title: 'Store workspace',
      subtitle:
        'First module: employee attendance. The remaining modules will be added step by step.',
      storeLabel: 'Store',
      today: 'Today',
      onShift: 'on shift',
      activeDevice: 'Device active',
      appTitle: 'App',
      modeLabel: 'Mode',
      standaloneMode: 'Installed as an app',
      browserMode: 'Opened in browser',
      allowNotifications: 'Allow notifications',
      testNotification: 'Test notification',
      inDevelopment: 'In development',
      menu: {
        attendance: 'Attendance',
        attendanceSubtitle: 'Employee check-in / check-out',
        settings: 'Settings',
        settingsSubtitle: 'App and notifications',
        currentShift: 'Current shift',
        tasks: 'Tasks',
        photoReports: 'Photo reports',
        productScan: 'Product scan',
        priceTags: 'Print price tags',
        openingControl: 'Opening control',
        itPanicButton: 'IT panic button',
        shiftMetrics: 'Shift metrics',
      },
    },
    settings: {
      back: '← Back',
      kicker: 'Settings',
      title: 'Settings',
      subtitle: 'App status and notifications.',
      appModeTitle: 'App',
      modeLabel: 'Mode',
      pushLabel: 'Push',
      allowNotifications: 'Allow notifications',
      testNotification: 'Test notification',
    },
    attendance: {
      back: '← Back',
      kicker: 'Attendance',
      title: 'Check-in / check-out',
      subtitle: 'The store is already authorized. Employees only mark themselves.',
      checkIn: 'Check in',
      checkOut: 'Check out',
      chooseMethod: 'Choose how to identify the employee.',
      scanBarcode: 'Scan barcode',
      enterCodeManually: 'Enter code manually',
      cancel: 'Cancel',
      identifyEmployee: 'Employee identification',
      openCamera: 'Open camera',
      testScan: 'Test scan',
      employeeCodePlaceholder: 'Identification code',
      findEmployee: 'Find employee',
      employeeFound: 'Employee found',
      codeLabel: 'Code',
      choosePosition: 'Choose position',
      confirmCheckIn: 'Confirm check-in',
      confirmCheckOutTitle: 'Confirm check-out',
      confirmCheckOutPrompt: 'Close this employee shift?',
      confirmCheckOut: 'Confirm check-out',
      todayOnShift: 'On shift today',
      noOpenShifts: 'No open shifts',
      checkInLabel: 'Check-in',
      messages: {
        employeeNotFound: 'Employee not found',
        alreadyOpenShift: 'This employee already has an open shift',
        openShiftNotFound: 'Open shift not found',
        shiftStarted: (name) => `Shift started: ${name}`,
        shiftFinished: (name) => `Shift finished: ${name}`,
      },
    },
    scanner: {
      title: 'Barcode scan',
      prompt: 'Point the camera at the employee badge.',
      close: 'Close scanner',
      cameraError: 'Could not start the camera. Check camera permission.',
    },
    positions: {
      Ревізор: 'Auditor',
      'Викладка / мерчендайзер': 'Merchandiser',
      Продавець: 'Sales associate',
    },
  },
}
