import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  createHRCandidate,
  getHRCandidate,
  getHRCandidateBadgeUrl,
  sendHRCandidateToOneC,
  updateHRCandidate,
} from '../api/client'
import type { HRCandidatePayload } from '../api/types'
import HRBadgePreview from './HRBadgePreview'
import HRStatusBadge from './HRStatusBadge'
import {
  HR_DRAFT_STORAGE_KEY,
  HR_QUEUE_STORAGE_KEY,
  calculateAge,
  formatDateTime,
  normalizeCandidateForm,
  readJson,
  writeJson,
} from './hrUtils'
import { emptyHRCandidateForm, hrCandidateSchema, type HRCandidateFormValues } from './hrValidation'

type HRCandidateFormPageProps = {
  accessToken: string
  candidateId: number | null
  onBack: () => void
  onSaved: (id: number) => void
}

type FieldProps = {
  label: string
  error?: string
  children: ReactNode
}

type QueuedCandidate = {
  id: string
  payload: HRCandidatePayload
  createdAt: string
}

function Field({ label, error, children }: FieldProps) {
  return (
    <label className="hr-field">
      <span>{label}</span>
      {children}
      {error ? <small className="hr-field-error">{error}</small> : null}
    </label>
  )
}

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^38/, '').slice(0, 10)
  if (!digits) {
    return ''
  }
  const padded = digits.padEnd(10, '_')
  return `+38 (${padded.slice(0, 3)}) ${padded.slice(3, 6)} ${padded.slice(6, 8)} ${padded.slice(8, 10)}`.replace(
    /_+$/g,
    '',
  )
}

function toPayload(values: HRCandidateFormValues): HRCandidatePayload {
  const parsed = hrCandidateSchema.parse(values)
  return {
    ...parsed,
    has_children: parsed.has_children,
    has_credits: parsed.has_credits,
    credits_amount: parsed.credits_amount,
    passport_copy_added: parsed.passport_copy_added ?? false,
    registration_copy_added: parsed.registration_copy_added ?? false,
    tax_code_copy_added: parsed.tax_code_copy_added ?? false,
  }
}

function queueCandidate(payload: HRCandidatePayload) {
  const queue = readJson<QueuedCandidate[]>(HR_QUEUE_STORAGE_KEY, [])
  queue.push({
    id: crypto.randomUUID(),
    payload,
    createdAt: new Date().toISOString(),
  })
  writeJson(HR_QUEUE_STORAGE_KEY, queue)
}

function HRCandidateFormPage({ accessToken, candidateId, onBack, onSaved }: HRCandidateFormPageProps) {
  const queryClient = useQueryClient()
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [isDirtySinceSave, setIsDirtySinceSave] = useState(false)
  const isEdit = candidateId !== null

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['hr-candidate', candidateId, accessToken],
    queryFn: () => getHRCandidate(accessToken, candidateId as number),
    enabled: isEdit,
  })

  const draft = useMemo(
    () => readJson<HRCandidateFormValues | null>(HR_DRAFT_STORAGE_KEY, null),
    [],
  )

  const form = useForm<HRCandidateFormValues>({
    defaultValues: draft && !isEdit ? draft : emptyHRCandidateForm,
  })
  const watchedValues = form.watch()
  const age = calculateAge(watchedValues.birth_date)

  useEffect(() => {
    if (candidate) {
      form.reset(normalizeCandidateForm(candidate))
      setIsDirtySinceSave(false)
    }
  }, [candidate, form])

  useEffect(() => {
    if (isEdit) {
      return
    }
    const timer = window.setTimeout(() => {
      writeJson(HR_DRAFT_STORAGE_KEY, watchedValues)
      setNotice('Чернетку збережено локально')
    }, 650)
    return () => window.clearTimeout(timer)
  }, [isEdit, watchedValues])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtySinceSave) {
        return
      }
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirtySinceSave])

  useEffect(() => {
    const subscription = form.watch(() => setIsDirtySinceSave(true))
    return () => subscription.unsubscribe()
  }, [form])

  const saveMutation = useMutation({
    mutationFn: async (payload: HRCandidatePayload) => {
      if (candidateId) {
        return updateHRCandidate(accessToken, candidateId, payload)
      }
      return createHRCandidate(accessToken, payload)
    },
    onSuccess: (saved) => {
      window.localStorage.removeItem(HR_DRAFT_STORAGE_KEY)
      setNotice('Анкету збережено')
      setIsDirtySinceSave(false)
      void queryClient.invalidateQueries({ queryKey: ['hr-candidates'] })
      onSaved(saved.id)
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (id: number) => sendHRCandidateToOneC(accessToken, id),
    onSuccess: (result) => {
      setNotice(result.ok ? 'Анкету відправлено в 1С' : result.message || '1С тимчасово недоступна')
      void queryClient.invalidateQueries({ queryKey: ['hr-candidate', candidateId, accessToken] })
      void queryClient.invalidateQueries({ queryKey: ['hr-candidates'] })
    },
  })

  const handleSave = async () => {
    setValidationErrors({})
    setNotice('')
    try {
      const payload = toPayload(form.getValues())
      return await saveMutation.mutateAsync(payload)
    } catch (error) {
      if (error && typeof error === 'object' && 'issues' in error) {
        const nextErrors: Record<string, string> = {}
        for (const issue of error.issues as Array<{ path: Array<string | number>; message: string }>) {
          nextErrors[String(issue.path[0])] = issue.message
        }
        setValidationErrors(nextErrors)
        setNotice('Перевірте обовʼязкові поля')
        return null
      }
      if (!navigator.onLine && !isEdit) {
        queueCandidate(toPayload(form.getValues()))
        setNotice('Немає мережі. Анкету додано в чергу відправки')
        setIsDirtySinceSave(false)
        return null
      }
      setNotice('Не вдалося зберегти анкету')
      return null
    }
  }

  const handleSaveAndPrint = async () => {
    const saved = await handleSave()
    const id = saved?.id ?? candidateId ?? candidate?.id
    if (id) {
      window.open(getHRCandidateBadgeUrl(id), '_blank', 'noopener,noreferrer')
    }
  }

  const handleSendToOneC = async () => {
    const id = candidateId ?? candidate?.id
    if (!id) {
      setNotice('Спочатку збережіть анкету')
      return
    }
    await sendMutation.mutateAsync(id)
  }

  const handleClear = () => {
    if (!window.confirm('Очистити форму?')) {
      return
    }
    form.reset(emptyHRCandidateForm)
    window.localStorage.removeItem(HR_DRAFT_STORAGE_KEY)
    setIsDirtySinceSave(false)
    setNotice('Форму очищено')
  }

  const openPrint = () => {
    const id = candidateId ?? candidate?.id
    if (!id) {
      setNotice('Для друку потрібно спочатку зберегти анкету')
      return
    }
    window.open(getHRCandidateBadgeUrl(id), '_blank', 'noopener,noreferrer')
  }

  if (isLoading) {
    return (
      <main className="hr-tablet-shell">
        <div className="hr-form-skeleton" />
        <div className="hr-form-skeleton" />
        <div className="hr-form-skeleton" />
      </main>
    )
  }

  return (
    <main className="hr-tablet-shell hr-form-shell">
      <header className="hr-page-header">
        <div>
          <button className="hr-link-button" type="button" onClick={onBack}>
            Назад до списку
          </button>
          <p className="hr-kicker">Анкета працівника</p>
          <h1>{candidate ? `${candidate.last_name} ${candidate.first_name}` : 'Новий кандидат'}</h1>
          <p>Дані з анкети відправляються в 1С. Employee створюється тільки після зворотної синхронізації.</p>
        </div>
        {candidate ? (
          <div className="hr-candidate-meta">
            <HRStatusBadge status={candidate.sync_status} />
            <span>Оновлено: {formatDateTime(candidate.updated_at)}</span>
            <span>{candidate.imported_employee_id ? `Employee #${candidate.imported_employee_id}` : 'Employee ще не імпортований'}</span>
          </div>
        ) : null}
      </header>

      <div className="hr-form-layout">
        <form className="hr-candidate-form" onSubmit={(event) => event.preventDefault()}>
          <section className="hr-form-card">
            <h2>Робота</h2>
            <div className="hr-field-grid three">
              <Field label="Посада">
                <input {...form.register('position')} placeholder="Продавець" />
              </Field>
              <Field label="Дата співбесіди">
                <input type="date" {...form.register('interview_date')} />
              </Field>
              <Field label="Дата стажування">
                <input type="datetime-local" {...form.register('internship_datetime')} />
              </Field>
            </div>
          </section>

          <section className="hr-form-card">
            <h2>ПІБ</h2>
            <div className="hr-field-grid three">
              <Field label="Прізвище" error={validationErrors.last_name}>
                <input {...form.register('last_name')} autoComplete="family-name" />
              </Field>
              <Field label="Імʼя" error={validationErrors.first_name}>
                <input {...form.register('first_name')} autoComplete="given-name" />
              </Field>
              <Field label="По батькові">
                <input {...form.register('middle_name')} />
              </Field>
            </div>
          </section>

          <section className="hr-form-card">
            <h2>Вік</h2>
            <div className="hr-field-grid two">
              <Field label="Дата народження">
                <input type="date" {...form.register('birth_date')} />
              </Field>
              <div className="hr-age-box">
                <span>Авто-вік</span>
                <strong>{age ?? '—'}</strong>
              </div>
            </div>
          </section>

          <section className="hr-form-card">
            <h2>Телефони</h2>
            <div className="hr-field-grid two">
              <Field label="Телефон 1">
                <input
                  inputMode="tel"
                  placeholder="+38 (0__) ___ __ __"
                  {...form.register('phone1')}
                  onBlur={(event) => form.setValue('phone1', formatPhoneInput(event.target.value))}
                />
              </Field>
              <Field label="Телефон 2">
                <input
                  inputMode="tel"
                  placeholder="+38 (0__) ___ __ __"
                  {...form.register('phone2')}
                  onBlur={(event) => form.setValue('phone2', formatPhoneInput(event.target.value))}
                />
              </Field>
            </div>
          </section>

          <section className="hr-form-card">
            <h2>Адреси</h2>
            <div className="hr-field-grid two">
              <Field label="Прописка">
                <textarea rows={3} {...form.register('registration_address')} />
              </Field>
              <Field label="Основне місце проживання">
                <textarea rows={3} {...form.register('residence_address')} />
              </Field>
            </div>
          </section>

          <section className="hr-form-card">
            <h2>Сімʼя і кредити</h2>
            <div className="hr-field-grid four">
              <Field label="Сімейний стан">
                <select {...form.register('marital_status')}>
                  <option value="">Не вказано</option>
                  <option value="married">Одружений(а)</option>
                  <option value="single">Не одружений(а)</option>
                </select>
              </Field>
              <label className="hr-switch">
                <input type="checkbox" {...form.register('has_children')} />
                <span>Є діти</span>
              </label>
              <label className="hr-switch">
                <input type="checkbox" {...form.register('has_credits')} />
                <span>Є кредити</span>
              </label>
              <Field label="Сума кредитів">
                <input inputMode="decimal" {...form.register('credits_amount')} />
              </Field>
            </div>
          </section>

          <section className="hr-form-card">
            <h2>Досвід</h2>
            <div className="hr-field-grid two">
              <Field label="Попереднє місце роботи">
                <input {...form.register('previous_workplace')} />
              </Field>
              <Field label="Стаж">
                <input {...form.register('work_experience')} />
              </Field>
            </div>
          </section>

          <section className="hr-form-card">
            <h2>Документи</h2>
            <div className="hr-field-grid two">
              <Field label="Паспорт">
                <input {...form.register('passport_code')} />
              </Field>
              <Field label="РНОКПП">
                <input inputMode="numeric" {...form.register('tax_code')} />
              </Field>
            </div>
            <div className="hr-document-row">
              <label><input type="checkbox" {...form.register('passport_copy_added')} /> Копія паспорта додана</label>
              <label><input type="checkbox" {...form.register('registration_copy_added')} /> Копія прописки додана</label>
              <label><input type="checkbox" {...form.register('tax_code_copy_added')} /> Копія ІПН додана</label>
            </div>
          </section>

          <section className="hr-form-card">
            <h2>Рішення HR</h2>
            <div className="hr-field-grid two">
              <Field label="Рішення">
                <select {...form.register('decision')}>
                  <option value="trainee">Стажування</option>
                  <option value="approved">Прийнятий</option>
                  <option value="rejected">Відмова</option>
                </select>
              </Field>
              <Field label="Коментар HR">
                <textarea rows={4} {...form.register('hr_comment')} />
              </Field>
            </div>
          </section>
        </form>

        <aside className="hr-side-panel">
          <HRBadgePreview candidate={candidate ?? null} draftName={watchedValues} />
          {candidate ? (
            <section className="hr-sync-card">
              <h2>Синхронізація</h2>
              <dl>
                <div>
                  <dt>Статус</dt>
                  <dd><HRStatusBadge status={candidate.sync_status} /></dd>
                </div>
                <div>
                  <dt>Відправлено</dt>
                  <dd>{formatDateTime(candidate.synced_at)}</dd>
                </div>
                <div>
                  <dt>Employee</dt>
                  <dd>{candidate.imported_employee_id ? `#${candidate.imported_employee_id}` : 'Очікує 1С'}</dd>
                </div>
              </dl>
            </section>
          ) : null}
        </aside>
      </div>

      {notice ? <div className="hr-toast">{notice}</div> : null}

      <footer className="hr-sticky-actions">
        <button type="button" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Збереження...' : 'Зберегти'}
        </button>
        <button type="button" onClick={handleSendToOneC} disabled={sendMutation.isPending}>
          {sendMutation.isPending ? 'Відправка...' : 'Відправити в 1С'}
        </button>
        <button type="button" onClick={openPrint}>Друк бейджу</button>
        <button type="button" className="secondary" onClick={handleSaveAndPrint}>Зберегти та друк</button>
        <button type="button" className="danger" onClick={handleClear}>Очистити</button>
      </footer>
    </main>
  )
}

export default HRCandidateFormPage
