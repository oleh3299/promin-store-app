import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createHRCandidate, getCurrentUser, loginUser } from '../api/client'
import type { HRCandidatePayload, UserRead } from '../api/types'
import HRCandidateFormPage from './HRCandidateFormPage'
import HRCandidateListPage from './HRCandidateListPage'
import HRLoginPage from './HRLoginPage'
import {
  HR_AUTH_STORAGE_KEY,
  HR_QUEUE_STORAGE_KEY,
  readJson,
  writeJson,
} from './hrUtils'

type HRAuthState = {
  accessToken: string
  user: UserRead | null
}

type HRRoute =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'detail'; id: number }

const allowedRoles = new Set(['admin', 'hr_manager', 'hr_tablet'])
const managerRoles = new Set(['admin', 'hr_manager'])

function parseRoute(): HRRoute {
  const path = window.location.pathname
  const detailMatch = path.match(/^\/admin\/hr\/candidates\/(\d+)$/)
  if (detailMatch) {
    return { name: 'detail', id: Number(detailMatch[1]) }
  }
  if (path.endsWith('/new')) {
    return { name: 'new' }
  }
  return { name: 'list' }
}

function pushRoute(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function HRTabletApp() {
  const queryClient = useQueryClient()
  const [route, setRoute] = useState<HRRoute>(parseRoute)
  const [auth, setAuth] = useState<HRAuthState | null>(() => readJson<HRAuthState | null>(HR_AUTH_STORAGE_KEY, null))
  const [loginError, setLoginError] = useState('')
  const [offlineQueueCount, setOfflineQueueCount] = useState(() => readJson(HR_QUEUE_STORAGE_KEY, []).length)

  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const userQuery = useQuery({
    queryKey: ['hr-me', auth?.accessToken],
    queryFn: () => getCurrentUser(auth?.accessToken ?? ''),
    enabled: Boolean(auth?.accessToken),
  })

  useEffect(() => {
    if (userQuery.data && auth) {
      const nextAuth = { accessToken: auth.accessToken, user: userQuery.data }
      writeJson(HR_AUTH_STORAGE_KEY, nextAuth)
    }
  }, [auth, userQuery.data])

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => loginUser(email, password),
    onSuccess: async (token) => {
      const user = await getCurrentUser(token.access_token)
      const nextAuth = { accessToken: token.access_token, user }
      setAuth(nextAuth)
      writeJson(HR_AUTH_STORAGE_KEY, nextAuth)
      setLoginError('')
    },
    onError: () => setLoginError('Невірний логін або пароль'),
  })

  const retryQueueMutation = useMutation({
    mutationFn: async () => {
      if (!auth?.accessToken) {
        return
      }
      const queue = readJson<Array<{ id: string; payload: HRCandidatePayload }>>(HR_QUEUE_STORAGE_KEY, [])
      const remaining = []
      for (const item of queue) {
        try {
          await createHRCandidate(auth.accessToken, item.payload)
        } catch {
          remaining.push(item)
        }
      }
      writeJson(HR_QUEUE_STORAGE_KEY, remaining)
      setOfflineQueueCount(remaining.length)
      await queryClient.invalidateQueries({ queryKey: ['hr-candidates'] })
    },
  })

  useEffect(() => {
    const handleOnline = () => {
      if (auth?.accessToken) {
        void retryQueueMutation.mutateAsync()
      }
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [auth?.accessToken, retryQueueMutation])

  const accessToken = auth?.accessToken
  const user = userQuery.data ?? auth?.user ?? null
  const hasAccess = useMemo(() => user && allowedRoles.has(user.role), [user])
  const canSeeList = useMemo(() => user && managerRoles.has(user.role), [user])

  const handleLogout = () => {
    window.localStorage.removeItem(HR_AUTH_STORAGE_KEY)
    setAuth(null)
    void queryClient.invalidateQueries({ queryKey: ['hr-me'] })
  }

  const navigateToList = useCallback(() => pushRoute('/admin/hr/candidates'), [])
  const navigateToNew = useCallback(() => pushRoute('/admin/hr/candidates/new'), [])
  const navigateToCandidate = useCallback((id: number) => pushRoute(`/admin/hr/candidates/${id}`), [])

  if (!accessToken) {
    return (
      <HRLoginPage
        error={loginError}
        isPending={loginMutation.isPending}
        onLogin={async (email, password) => {
          await loginMutation.mutateAsync({ email, password })
        }}
      />
    )
  }

  if (userQuery.isLoading && !user) {
    return <main className="hr-tablet-shell"><div className="hr-form-skeleton" /></main>
  }

  if (!hasAccess) {
    return (
      <main className="hr-tablet-shell">
        <section className="hr-empty-state">
          <strong>Немає доступу</strong>
          <span>Для HR планшета потрібна роль admin, hr_manager або hr_tablet.</span>
          <button type="button" className="hr-primary-action" onClick={handleLogout}>Вийти</button>
        </section>
      </main>
    )
  }

  if (route.name === 'list' && !canSeeList) {
    return (
      <>
        <div className="hr-session-bar">
          <span>{user?.full_name}</span>
          <strong>{navigator.onLine ? 'Онлайн' : 'Офлайн'}</strong>
          <button type="button" onClick={handleLogout}>Вийти</button>
        </div>
        <HRCandidateFormPage
          accessToken={accessToken}
          candidateId={null}
          onBack={navigateToNew}
          onSaved={navigateToCandidate}
        />
      </>
    )
  }

  return (
    <>
      <div className="hr-session-bar">
        <span>{user?.full_name}</span>
        <strong>{navigator.onLine ? 'Онлайн' : 'Офлайн'}</strong>
        {offlineQueueCount > 0 ? (
          <button type="button" onClick={() => retryQueueMutation.mutate()}>
            Черга: {offlineQueueCount}
          </button>
        ) : null}
        <button type="button" onClick={handleLogout}>Вийти</button>
      </div>
      {route.name === 'new' ? (
        <HRCandidateFormPage
          accessToken={accessToken}
          candidateId={null}
          onBack={canSeeList ? navigateToList : navigateToNew}
          onSaved={navigateToCandidate}
        />
      ) : null}
      {route.name === 'detail' ? (
        <HRCandidateFormPage
          accessToken={accessToken}
          candidateId={route.id}
          onBack={canSeeList ? navigateToList : navigateToNew}
          onSaved={navigateToCandidate}
        />
      ) : null}
      {route.name === 'list' ? (
        <HRCandidateListPage
          accessToken={accessToken}
          onOpenCandidate={navigateToCandidate}
          onNewCandidate={navigateToNew}
        />
      ) : null}
    </>
  )
}

export default HRTabletApp
