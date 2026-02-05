'use client'

import { useParams } from 'next/navigation'
import IntakeReview from '@/components/attorney/IntakeReview'

export default function IntakeReviewPage() {
  const params = useParams()
  const intakeId = params.id as string

  return <IntakeReview intakeId={intakeId} />
}
