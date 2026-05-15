import { useState } from 'react'
import type { FormEvent } from 'react'

type HRLoginPageProps = {
  error: string
  isPending: boolean
  onLogin: (email: string, password: string) => Promise<void>
}

function HRLoginPage({ error, isPending, onLogin }: HRLoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await onLogin(email, password)
  }

  return (
    <main className="hr-tablet-shell hr-login-shell">
      <section className="hr-login-card">
        <p className="hr-kicker">PROMIN HR</p>
        <h1>Кадровий планшет</h1>
        <p>Вхід для HR, адміністратора або планшета відділу кадрів.</p>
        <form onSubmit={handleSubmit} className="hr-login-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              autoComplete="username"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <div className="hr-alert error">{error}</div> : null}
          <button className="hr-primary-action" disabled={isPending} type="submit">
            {isPending ? 'Вхід...' : 'Увійти'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default HRLoginPage
