import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getHRCandidates } from '../api/client'
import type { HRCandidate, HRCandidateStatus } from '../api/types'
import HRStatusBadge from './HRStatusBadge'
import { formatDate, formatDateTime, getCandidateFullName, statusLabels } from './hrUtils'

type HRCandidateListPageProps = {
  accessToken: string
  onOpenCandidate: (id: number) => void
  onNewCandidate: () => void
}

const statusOptions: Array<HRCandidateStatus | 'all'> = [
  'all',
  'candidate',
  'trainee',
  'approved',
  'synced_to_1c',
  'imported_from_1c',
  'rejected',
]

function CandidateSkeleton() {
  return (
    <div className="hr-candidate-card skeleton">
      <span />
      <strong />
      <p />
    </div>
  )
}

function candidateMatchesSearch(candidate: HRCandidate, search: string) {
  const normalized = search.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  return [
    candidate.last_name,
    candidate.first_name,
    candidate.middle_name,
    candidate.phone1,
    candidate.phone2,
    candidate.tax_code,
    candidate.position,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalized)
}

function HRCandidateListPage({ accessToken, onOpenCandidate, onNewCandidate }: HRCandidateListPageProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<HRCandidateStatus | 'all'>('all')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['hr-candidates', accessToken],
    queryFn: () => getHRCandidates(accessToken),
  })

  const candidates = useMemo(() => {
    return [...(data?.items ?? [])]
      .filter((candidate) => status === 'all' || candidate.sync_status === status)
      .filter((candidate) => candidateMatchesSearch(candidate, search))
      .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())
  }, [data?.items, search, status])

  return (
    <main className="hr-tablet-shell">
      <header className="hr-page-header">
        <div>
          <p className="hr-kicker">HR / Кадри</p>
          <h1>Анкети кандидатів</h1>
          <p>Швидкий список для співбесід, стажування і контролю 1С.</p>
        </div>
        <button type="button" className="hr-primary-action" onClick={onNewCandidate}>
          Новий кандидат
        </button>
      </header>

      <section className="hr-toolbar-card">
        <label className="hr-search">
          Пошук
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ПІБ, телефон, РНОКПП"
          />
        </label>
        <div className="hr-status-tabs" role="tablist" aria-label="Фільтр статусу">
          {statusOptions.map((item) => (
            <button
              key={item}
              type="button"
              className={status === item ? 'active' : ''}
              onClick={() => setStatus(item)}
            >
              {item === 'all' ? 'Усі' : statusLabels[item]}
            </button>
          ))}
        </div>
      </section>

      {isError ? (
        <section className="hr-alert error">
          Не вдалося завантажити анкети.
          <button type="button" onClick={() => void refetch()}>
            Спробувати ще раз
          </button>
        </section>
      ) : null}

      <section className="hr-candidate-grid">
        {isLoading ? (
          <>
            <CandidateSkeleton />
            <CandidateSkeleton />
            <CandidateSkeleton />
          </>
        ) : null}

        {!isLoading && candidates.length === 0 ? (
          <div className="hr-empty-state">
            <strong>Анкет не знайдено</strong>
            <span>Змініть пошук або створіть нового кандидата.</span>
          </div>
        ) : null}

        {candidates.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            className="hr-candidate-card"
            onClick={() => onOpenCandidate(candidate.id)}
          >
            <div className="hr-card-topline">
              <HRStatusBadge status={candidate.sync_status} />
              <span>{formatDateTime(candidate.updated_at)}</span>
            </div>
            <strong>{getCandidateFullName(candidate)}</strong>
            <p>{candidate.position || 'Посада не вказана'}</p>
            <dl>
              <div>
                <dt>Телефон</dt>
                <dd>{candidate.phone1 || 'Не вказано'}</dd>
              </div>
              <div>
                <dt>Співбесіда</dt>
                <dd>{formatDate(candidate.interview_date)}</dd>
              </div>
              <div>
                <dt>1С</dt>
                <dd>{candidate.imported_employee_id ? `Employee #${candidate.imported_employee_id}` : 'Очікує'}</dd>
              </div>
            </dl>
          </button>
        ))}
      </section>
    </main>
  )
}

export default HRCandidateListPage
