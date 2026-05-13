import { useMemo } from 'react'
import { translations, type Language } from './translations'

export function useI18n(language: Language) {
  return useMemo(() => translations[language], [language])
}
