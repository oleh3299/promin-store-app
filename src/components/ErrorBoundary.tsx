import { Component, type ErrorInfo, type ReactNode } from 'react'
import { resetStoredScreen } from '../lib/storage'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  message: string
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React render error boundary caught an error', {
      error,
      componentStack: info.componentStack,
    })
  }

  private reloadApp = () => {
    window.location.reload()
  }

  private returnHome = () => {
    resetStoredScreen('home')
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <main className="app-shell">
        <section className="panel error-panel">
          <p className="app-kicker">Promin Store</p>
          <h1>Щось пішло не так</h1>
          <p className="app-subtitle">
            Застосунок перехопив помилку, щоб не залишати білий екран.
          </p>
          {this.state.message && (
            <pre className="error-details">{this.state.message}</pre>
          )}
          <button className="wide-button" onClick={this.returnHome}>
            Повернутися на головну
          </button>
          <button className="wide-button secondary" onClick={this.reloadApp}>
            Reload app
          </button>
        </section>
      </main>
    )
  }
}

export default ErrorBoundary
