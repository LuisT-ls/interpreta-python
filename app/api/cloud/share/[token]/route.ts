import { createHash } from 'node:crypto'
import { getCloudPool } from '@/lib/cloud-db'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!TOKEN_PATTERN.test(token)) return Response.json({ error: 'Este link não é válido.' }, { status: 404 })

  const tokenHash = createHash('sha256').update(token).digest('hex')
  try {
    const { rows } = await getCloudPool().query(
      `SELECT cloud_project_shares.project_name AS name, cloud_project_shares.payload AS project,
              date_trunc('milliseconds', cloud_project_shares.project_updated_at) AS "updatedAt",
              date_trunc('milliseconds', cloud_project_shares.expires_at) AS "expiresAt"
       FROM cloud_project_shares
       JOIN cloud_projects USING (owner_id, project_id)
       WHERE cloud_project_shares.token_hash = $1 AND cloud_project_shares.expires_at > now()`,
      [tokenHash],
    )
    if (rows.length === 0) return Response.json({ error: 'Este link expirou, foi revogado ou não existe.' }, { status: 404 })
    return Response.json(rows[0], { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'O compartilhamento está temporariamente indisponível.' }, { status: 503 })
  }
}
