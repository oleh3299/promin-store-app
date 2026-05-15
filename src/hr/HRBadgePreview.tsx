import { QRCodeSVG } from 'qrcode.react'
import type { HRCandidate } from '../api/types'
import { getCandidateFullName } from './hrUtils'

type HRBadgePreviewProps = {
  candidate: HRCandidate | null
  draftName?: {
    last_name?: string
    first_name?: string
    middle_name?: string | null
    position?: string | null
  }
}

function HRBadgePreview({ candidate, draftName }: HRBadgePreviewProps) {
  const source = candidate ?? {
    last_name: draftName?.last_name || 'ПРІЗВИЩЕ',
    first_name: draftName?.first_name || 'Імʼя',
    middle_name: draftName?.middle_name || '',
  }
  const badgeCode = candidate?.badge_code ?? 'HR-DRAFT'
  const position = candidate?.position ?? draftName?.position ?? 'Працівник магазину'

  return (
    <section className="hr-badge-preview" aria-label="Попередній перегляд бейджа">
      <div className="hr-badge-brand">ПРОМІНЬ</div>
      <div className="hr-badge-name">
        <strong>{source.last_name || 'ПРІЗВИЩЕ'}</strong>
        <span>{getCandidateFullName(source).replace(source.last_name, '').trim() || 'Імʼя По батькові'}</span>
        <small>{position}</small>
      </div>
      <QRCodeSVG value={badgeCode} size={112} fgColor="#0F3D2E" bgColor="#ffffff" level="M" />
      <p>{badgeCode}</p>
    </section>
  )
}

export default HRBadgePreview
