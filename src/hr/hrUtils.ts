import type { HRCandidate, HRCandidateStatus } from '../api/types'
import type { HRCandidateFormValues } from './hrValidation'

export const HR_AUTH_STORAGE_KEY = 'promin.hr.auth'
export const HR_DRAFT_STORAGE_KEY = 'promin.hr.candidateDraft'
export const HR_QUEUE_STORAGE_KEY = 'promin.hr.offlineQueue'

export const statusLabels: Record<HRCandidateStatus, string> = {
  candidate: 'Кандидат',
  trainee: 'Стажер',
  approved: 'Прийнятий',
  synced_to_1c: 'Відправлено в 1С',
  imported_from_1c: 'Імпортовано з 1С',
  rejected: 'Відмова',
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Не вказано'
  }

  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Не вказано'
  }

  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function getCandidateFullName(candidate: Pick<HRCandidate, 'last_name' | 'first_name' | 'middle_name'>) {
  return [candidate.last_name, candidate.first_name, candidate.middle_name].filter(Boolean).join(' ')
}

export function normalizeCandidateForm(candidate: HRCandidate): HRCandidateFormValues {
  const documentMap = new Map(candidate.documents.map((item) => [item.document_type, item.is_added]))

  return {
    position: candidate.position ?? '',
    interview_date: candidate.interview_date ?? '',
    internship_datetime: candidate.internship_datetime ? candidate.internship_datetime.slice(0, 16) : '',
    last_name: candidate.last_name,
    first_name: candidate.first_name,
    middle_name: candidate.middle_name ?? '',
    birth_date: candidate.birth_date ?? '',
    phone1: candidate.phone1 ?? '',
    phone2: candidate.phone2 ?? '',
    registration_address: candidate.registration_address ?? '',
    residence_address: candidate.residence_address ?? '',
    marital_status: candidate.marital_status ?? '',
    has_children: candidate.has_children,
    has_credits: candidate.has_credits,
    credits_amount: candidate.credits_amount ? String(candidate.credits_amount) : '',
    previous_workplace: candidate.previous_workplace ?? '',
    work_experience: candidate.work_experience ?? '',
    passport_code: candidate.passport_code ?? '',
    tax_code: candidate.tax_code ?? '',
    passport_copy_added: documentMap.get('passport_copy') ?? false,
    registration_copy_added: documentMap.get('registration_copy') ?? false,
    tax_code_copy_added: documentMap.get('tax_code_copy') ?? false,
    hr_comment: candidate.hr_comment ?? '',
    decision: candidate.decision,
  }
}

export function calculateAge(birthDate: string | null | undefined) {
  if (!birthDate) {
    return null
  }

  const date = new Date(birthDate)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDelta = today.getMonth() - date.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
    age -= 1
  }
  return age
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value))
}
