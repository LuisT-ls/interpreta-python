import { requireCloudUser } from '@/lib/cloud-auth'
import { getCloudPool } from '@/lib/cloud-db'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireCloudUser()
  if (!auth.ok) return auth.response

  const { projectId } = await params
  if (!UUID_PATTERN.test(projectId)) return Response.json({ error: 'Projeto não encontrado.' }, { status: 404 })

  try {
    const { rows } = await getCloudPool().query(
      `SELECT project_id AS id, name, payload AS project, date_trunc('milliseconds', updated_at) AS "updatedAt"
       FROM cloud_projects WHERE owner_id = $1 AND project_id = $2::uuid`,
      [auth.userId, projectId],
    )
    if (rows.length === 0) return Response.json({ error: 'Projeto não encontrado.' }, { status: 404 })
    return Response.json(rows[0], { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json(
      { error: 'Não foi possível carregar o projeto da nuvem.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
