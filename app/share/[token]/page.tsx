import type { Metadata } from 'next'
import { SharedCloudProject } from '@/components/SharedCloudProject'

export const metadata: Metadata = {
  title: 'Projeto compartilhado',
  robots: { index: false, follow: false },
}

export default async function SharedProjectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <SharedCloudProject token={token} />
}
