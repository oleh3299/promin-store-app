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
  common: {
    yes: string
    no: string
    unknown: string
    online: string
    offline: string
  }
  auth: {
    title: string
    subtitle: string
    deviceLogin: string
    deviceLoginPlaceholder: string
    deviceLoginHelper: string
    password: string
    login: string
    logout: string
    error: string
    invalidCredentials: string
    disabledDevice: string
  }
  home: {
    title: string
    today: string
    onShift: string
    activeDevice: string
    standaloneMode: string
    browserMode: string
    inDevelopment: string
    menu: {
      attendance: string
      attendanceSubtitle: string
      settings: string
      settingsSubtitle: string
      diagnostics: string
      diagnosticsSubtitle: string
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
  diagnostics: {
    back: string
    kicker: string
    title: string
    subtitle: string
    apiStatus: string
    checkApi: string
    deviceLogin: string
    devicePrefix: string
    store: string
    signedOut: string
    queue: string
    queueItems: (count: number) => string
    lastSync: string
    appVersion: string
    syncNow: string
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
      queuedOffline: string
      syncedOnline: string
      invalidBarcode: string
      deviceRequired: string
      authRequired: string
      malformedEmployee: string
      networkLookupFailed: string
      shiftStarted: (name: string) => string
      shiftFinished: (name: string) => string
    }
  }
  scanner: {
    title: string
    prompt: string
    close: string
    cameraError: string
    holdHint: string
    frameLabel: string
    confirmCode: string
    confirm: string
    scanAgain: string
    manualEntry: string
    invalidCode: string
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
    common: {
      yes: 'Так',
      no: 'Ні',
      unknown: 'Невідомо',
      online: 'Онлайн',
      offline: 'Офлайн',
    },
    auth: {
      title: 'Вхід до Promin Store',
      subtitle: 'Увійдіть, щоб підключити пристрій до робочого API.',
      deviceLogin: 'Логін пристрою',
      deviceLoginPlaceholder: 'm28',
      deviceLoginHelper: 'Використовуйте логін магазину (наприклад m28)',
      password: 'Пароль пристрою',
      login: 'Увійти',
      logout: 'Вийти',
      error: 'Невірний логін або пароль',
      invalidCredentials: 'Невірний логін або пароль',
      disabledDevice: 'Пристрій відключено адміністратором',
    },
    home: {
      title: 'Робоче місце магазину',
      today: 'Сьогодні',
      onShift: 'на зміні',
      activeDevice: 'Пристрій активний',
      standaloneMode: 'Встановлено як застосунок',
      browserMode: 'Відкрито в браузері',
      inDevelopment: 'У розробці',
      menu: {
        attendance: 'Табель',
        attendanceSubtitle: 'Прихід / вихід співробітників',
        settings: 'Налаштування',
        settingsSubtitle: 'Застосунок і сповіщення',
        diagnostics: 'Діагностика',
        diagnosticsSubtitle: 'API, авторизація та синхронізація',
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
    diagnostics: {
      back: '← Назад',
      kicker: 'Діагностика',
      title: 'Стан підключення',
      subtitle: 'Перевірка API, пристрою та локальної черги.',
      apiStatus: 'API',
      checkApi: 'Перевірити API',
      deviceLogin: 'Логін пристрою',
      devicePrefix: 'Пристрій',
      store: 'Магазин',
      signedOut: 'Пристрій не авторизовано',
      queue: 'Офлайн-черга',
      queueItems: (count) => `${count} подій`,
      lastSync: 'Остання синхронізація',
      appVersion: 'Версія застосунку',
      syncNow: 'Синхронізувати',
    },
    attendance: {
      back: '← Назад',
      kicker: 'Табель',
      title: 'Прихід / вихід',
      subtitle: 'Співробітник відмічає тільки себе.',
      checkIn: 'Прихід',
      checkOut: 'Вихід',
      chooseMethod: 'Оберіть спосіб ідентифікації співробітника.',
      scanBarcode: 'Сканувати штрихкод',
      enterCodeManually: 'Ввести код вручну',
      cancel: 'Скасувати',
      identifyEmployee: 'Ідентифікація співробітника',
      openCamera: 'Відкрити камеру',
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
        queuedOffline: 'Дію збережено локально і буде синхронізовано',
        syncedOnline: 'Дію синхронізовано з API',
        invalidBarcode: 'Штрихкод порожній або некоректний',
        deviceRequired: 'Пристрій не авторизовано. Увійдіть як магазинний термінал.',
        authRequired: 'Сесія або пристрій не авторизовані. Увійдіть ще раз.',
        malformedEmployee: 'API повернув некоректні дані співробітника',
        networkLookupFailed: 'Не вдалося підключитися до API. Спробуйте ще раз.',
        shiftStarted: (name) => `Зміну розпочато: ${name}`,
        shiftFinished: (name) => `Зміну завершено: ${name}`,
      },
    },
    scanner: {
      title: 'Сканування штрихкоду',
      prompt: 'Наведіть камеру на бейдж співробітника.',
      close: 'Закрити сканер',
      cameraError: 'Не вдалося запустити камеру. Перевірте дозвіл камери.',
      holdHint: 'Тримайте бейдж рівно, 10–20 см від камери',
      frameLabel: 'Наведіть штрихкод сюди',
      confirmCode: 'Розпізнаний код',
      confirm: 'Підтвердити',
      scanAgain: 'Сканувати ще раз',
      manualEntry: 'Ввести код вручну',
      invalidCode: 'Код не схожий на штрихкод співробітника',
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
      testNotificationBody: 'Тестовое уведомление работает',
    },
    common: {
      yes: 'Да',
      no: 'Нет',
      unknown: 'Неизвестно',
      online: 'Онлайн',
      offline: 'Офлайн',
    },
    auth: {
      title: 'Вход в Promin Store',
      subtitle: 'Войдите, чтобы подключить устройство к рабочему API.',
      deviceLogin: 'Логін пристрою',
      deviceLoginPlaceholder: 'm28',
      deviceLoginHelper: 'Використовуйте логін магазину (наприклад m28)',
      password: 'Пароль пристрою',
      login: 'Войти',
      logout: 'Выйти',
      error: 'Невірний логін або пароль',
      invalidCredentials: 'Невірний логін або пароль',
      disabledDevice: 'Пристрій відключено адміністратором',
    },
    home: {
      title: 'Рабочее место магазина',
      today: 'Сегодня',
      onShift: 'на смене',
      activeDevice: 'Устройство активно',
      standaloneMode: 'Установлено как приложение',
      browserMode: 'Открыто в браузере',
      inDevelopment: 'В разработке',
      menu: {
        attendance: 'Табель',
        attendanceSubtitle: 'Приход / уход сотрудников',
        settings: 'Настройки',
        settingsSubtitle: 'Приложение и уведомления',
        diagnostics: 'Диагностика',
        diagnosticsSubtitle: 'API, авторизация и синхронизация',
        currentShift: 'Кто на смене',
        tasks: 'Задания',
        photoReports: 'Фотоотчеты',
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
    diagnostics: {
      back: '← Назад',
      kicker: 'Диагностика',
      title: 'Состояние подключения',
      subtitle: 'Проверка API, устройства и локальной очереди.',
      apiStatus: 'API',
      checkApi: 'Проверить API',
      deviceLogin: 'Логін пристрою',
      devicePrefix: 'Пристрій',
      store: 'Магазин',
      signedOut: 'Пристрій не авторизовано',
      queue: 'Офлайн-очередь',
      queueItems: (count) => `${count} событий`,
      lastSync: 'Последняя синхронизация',
      appVersion: 'Версія застосунку',
      syncNow: 'Синхронизировать',
    },
    attendance: {
      back: '← Назад',
      kicker: 'Табель',
      title: 'Приход / уход',
      subtitle: 'Сотрудник отмечает только себя.',
      checkIn: 'Приход',
      checkOut: 'Уход',
      chooseMethod: 'Выберите способ идентификации сотрудника.',
      scanBarcode: 'Сканировать штрихкод',
      enterCodeManually: 'Ввести код вручную',
      cancel: 'Отмена',
      identifyEmployee: 'Идентификация сотрудника',
      openCamera: 'Открыть камеру',
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
        queuedOffline: 'Действие сохранено локально и будет синхронизировано',
        syncedOnline: 'Действие синхронизировано с API',
        invalidBarcode: 'Штрихкод пустой или некорректный',
        deviceRequired: 'Пристрій не авторизовано. Увійдіть як магазинний термінал.',
        authRequired: 'Сессия или устройство не авторизованы. Войдите еще раз.',
        malformedEmployee: 'API вернул некорректные данные сотрудника',
        networkLookupFailed: 'Не удалось подключиться к API. Попробуйте еще раз.',
        shiftStarted: (name) => `Смена начата: ${name}`,
        shiftFinished: (name) => `Смена завершена: ${name}`,
      },
    },
    scanner: {
      title: 'Сканирование штрихкода',
      prompt: 'Наведите камеру на бейдж сотрудника.',
      close: 'Закрыть сканер',
      cameraError: 'Не удалось запустить камеру. Проверьте разрешение камеры.',
      holdHint: 'Держите бейдж ровно, 10–20 см от камеры',
      frameLabel: 'Наведите штрихкод сюда',
      confirmCode: 'Распознанный код',
      confirm: 'Подтвердить',
      scanAgain: 'Сканировать еще раз',
      manualEntry: 'Ввести код вручную',
      invalidCode: 'Код не похож на штрихкод сотрудника',
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
    common: {
      yes: 'Yes',
      no: 'No',
      unknown: 'Unknown',
      online: 'Online',
      offline: 'Offline',
    },
    auth: {
      title: 'Sign in to Promin Store',
      subtitle: 'Sign in to connect this device to the live API.',
      deviceLogin: 'Логін пристрою',
      deviceLoginPlaceholder: 'm28',
      deviceLoginHelper: 'Використовуйте логін магазину (наприклад m28)',
      password: 'Пароль пристрою',
      login: 'Увійти',
      logout: 'Вийти',
      error: 'Невірний логін або пароль',
      invalidCredentials: 'Невірний логін або пароль',
      disabledDevice: 'Пристрій відключено адміністратором',
    },
    home: {
      title: 'Store workspace',
      today: 'Today',
      onShift: 'on shift',
      activeDevice: 'Device active',
      standaloneMode: 'Installed as an app',
      browserMode: 'Opened in browser',
      inDevelopment: 'In development',
      menu: {
        attendance: 'Attendance',
        attendanceSubtitle: 'Employee check-in / check-out',
        settings: 'Settings',
        settingsSubtitle: 'App and notifications',
        diagnostics: 'Diagnostics',
        diagnosticsSubtitle: 'API, auth, and sync',
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
    diagnostics: {
      back: '← Back',
      kicker: 'Diagnostics',
      title: 'Connection status',
      subtitle: 'API, device, and local queue checks.',
      apiStatus: 'API',
      checkApi: 'Check API',
      deviceLogin: 'Логін пристрою',
      devicePrefix: 'Пристрій',
      store: 'Магазин',
      signedOut: 'Пристрій не авторизовано',
      queue: 'Offline queue',
      queueItems: (count) => `${count} events`,
      lastSync: 'Last sync',
      appVersion: 'Версія застосунку',
      syncNow: 'Sync now',
    },
    attendance: {
      back: '← Back',
      kicker: 'Attendance',
      title: 'Check-in / check-out',
      subtitle: 'Employees only mark themselves.',
      checkIn: 'Check in',
      checkOut: 'Check out',
      chooseMethod: 'Choose how to identify the employee.',
      scanBarcode: 'Scan barcode',
      enterCodeManually: 'Enter code manually',
      cancel: 'Cancel',
      identifyEmployee: 'Employee identification',
      openCamera: 'Open camera',
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
        queuedOffline: 'Action saved locally and will be synced',
        syncedOnline: 'Action synced with API',
        invalidBarcode: 'The barcode is empty or invalid',
        deviceRequired: 'Пристрій не авторизовано. Увійдіть як магазинний термінал.',
        authRequired: 'Session or device is not authorized. Sign in again.',
        malformedEmployee: 'API returned malformed employee data',
        networkLookupFailed: 'Could not reach the API. Try again.',
        shiftStarted: (name) => `Shift started: ${name}`,
        shiftFinished: (name) => `Shift finished: ${name}`,
      },
    },
    scanner: {
      title: 'Barcode scan',
      prompt: 'Point the camera at the employee badge.',
      close: 'Close scanner',
      cameraError: 'Could not start the camera. Check camera permission.',
      holdHint: 'Keep the badge straight, 10–20 cm from the camera',
      frameLabel: 'Place the barcode here',
      confirmCode: 'Recognized code',
      confirm: 'Confirm',
      scanAgain: 'Scan again',
      manualEntry: 'Enter code manually',
      invalidCode: 'This does not look like an employee barcode',
    },
    positions: {
      Ревізор: 'Auditor',
      'Викладка / мерчендайзер': 'Merchandiser',
      Продавець: 'Sales associate',
    },
  },
}
