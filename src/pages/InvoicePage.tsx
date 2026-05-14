import type { Translation } from '../i18n/translations'

type InvoicePageProps = {
  t: Translation
  onBack: () => void
}

function InvoicePage({ t, onBack }: InvoicePageProps) {
  return (
    <main className="app-shell">
      <button className="back-button" onClick={onBack}>
        {t.invoice.back}
      </button>

      <section className="app-header vertical">
        <p className="app-kicker">{t.invoice.kicker}</p>
        <h1>{t.invoice.title}</h1>
        <p className="app-subtitle">{t.invoice.subtitle}</p>
      </section>

      <section className="panel coming-soon-panel">
        <h2>{t.invoice.preparingTitle}</h2>
        <p>{t.invoice.preparingText}</p>
      </section>
    </main>
  )
}

export default InvoicePage
