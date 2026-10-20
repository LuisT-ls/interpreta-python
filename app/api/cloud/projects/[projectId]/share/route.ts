import { createHash, randomBytes } from 'node:crypto'
import { requireCloudUser } from '@/lib/cloud-auth'
import { getCloudPool } from '@/lib/cloud-db'
import { getAppBaseUrl } from '@/lib/auth0'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireCloudUser()
  if (!auth.ok) return auth.response

  const { projectId } = await params
  if (!UUID_PATTERN.test(projectId)) return Response.json({ error: 'Projeto não encontrado.' }, { status: 404 })
  const appBaseUrl = getAppBaseUrl()
  if (!appBaseUrl) return Response.json({ error: 'URL pública do aplicativo não está configurada.' }, { status: 503 })

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')

  try {
    const { rows } = await getCloudPool().query(
      `INSERT INTO cloud_project_shares (owner_id, project_id, token_hash, expires_at, project_name, payload, project_updated_at)
       SELECT owner_id, project_id, $3, now() + interval '30 days', name, payload, updated_at
       FROM cloud_projects WHERE owner_id = $1 AND project_id = $2::uuid
       ON CONFLICT (owner_id, project_id) DO UPDATE
       SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at,
           project_name = EXCLUDED.project_name, payload = EXCLUDED.payload,
           project_updated_at = EXCLUDED.project_updated_at, updated_at = now()
       RETURNING date_trunc('milliseconds', expires_at) AS "expiresAt"`,
      [auth.userId, projectId, tokenHash],
    )
    if (rows.length === 0) return Response.json({ error: 'Salve o projeto na nuvem antes de criar um link.' }, { status: 404 })

    return Response.json({ url: new URL(`/share/${token}`, appBaseUrl).toString(), expiresAt: rows[0].expiresAt }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json({ error: 'Não foi possível criar o link de compartilhamento.' }, { status: 503 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireCloudUser()
  if (!auth.ok) return auth.response

  const { projectId } = await params
  if (!UUID_PATTERN.test(projectId)) return Response.json({ error: 'Projeto não encontrado.' }, { status: 404 })

  try {
    await getCloudPool().query(
      'DELETE FROM cloud_project_shares WHERE owner_id = $1 AND project_id = $2::uuid',
      [auth.userId, projectId],
    )
    return Response.json({ revoked: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'Não foi possível revogar o link.' }, { status: 503 })
  }
}
