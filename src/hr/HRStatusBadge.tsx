import type { HRCandidateStatus } from '../api/types'
import { statusLabels } from './hrUtils'

function HRStatusBadge({ status }: { status: HRCandidateStatus }) {
  return <span className={`hr-status-badge ${status}`}>{statusLabels[status]}</span>
}

export default HRStatusBadge
