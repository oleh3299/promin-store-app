import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Language, Translation } from '../i18n/translations'
import {
  languageCodes,
  translations,
} from '../i18n/translations'

type LoginPageProps = {
  language: Language
  t: Translation
  isSubmitting: boolean
  error: string
  onLanguageChange: (language: Language) => void
  onLogin: (login: string, password: string) => Promise<void>
}

function LoginPage({
  language,
  t,
  isSubmitting,
  error,
  onLanguageChange,
  onLogin,
}: LoginPageProps) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onLogin(login.trim(), password)
  }

  return (
    <main className="app-shell">
      <section className="app-header home-header">
        <div className="home-title">
          <p className="app-kicker">Promin Store</p>
          <h1>{t.auth.title}</h1>
          <p className="app-subtitle">{t.auth.subtitle}</p>
        </div>

        <div className="language-switcher" aria-label="Language">
          {languageCodes.map((code) => (
            <button
              key={code}
              type="button"
              className={language === code ? 'selected' : undefined}
              onClick={() => onLanguageChange(code)}
              aria-label={translations[code].language.name}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="message-box">{error}</div>}

      <form className="panel login-form" onSubmit={handleSubmit}>
        <label>
          <span>{t.auth.deviceLogin}</span>
          <input
            autoComplete="username"
            inputMode="text"
            type="text"
            placeholder={t.auth.deviceLoginPlaceholder}
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            required
          />
          <small>{t.auth.deviceLoginHelper}</small>
        </label>

        <label>
          <span>{t.auth.password}</span>
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="wide-button" disabled={isSubmitting} type="submit">
          {t.auth.login}
        </button>
      </form>
    </main>
  )
}

export default LoginPage
