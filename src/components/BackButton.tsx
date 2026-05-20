type BackButtonProps = {
  label?: string
  onBack?: () => void
  className?: string
}

function canNavigateBrowserHistory() {
  const historyState = window.history.state as { idx?: unknown } | null
  return typeof historyState?.idx === 'number' && historyState.idx > 0
}

function BackButton({ label = 'Назад', onBack, className }: BackButtonProps) {
  const handleClick = () => {
    if (canNavigateBrowserHistory()) {
      window.history.back()
      return
    }

    onBack?.()
  }

  return (
    <button className={className ? `back-button ${className}` : 'back-button'} onClick={handleClick} type="button">
      <span aria-hidden="true">←</span>
      {label}
    </button>
  )
}

export default BackButton
