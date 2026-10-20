import { requireCloudUser } from '@/lib/cloud-auth'
import { getCloudPool } from '@/lib/cloud-db'
import type { CloudWorkspaceProject } from '@/utils/cloudProject'

export const dynamic = 'force-dynamic'

const MAX_PROJECT_BYTES = 3_500_000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET() {
  const auth = await requireCloudUser()
  if (!auth.ok) return auth.response

  try {
    const { rows } = await getCloudPool().query(
      `SELECT project_id AS id, name, date_trunc('milliseconds', updated_at) AS "updatedAt", octet_length(payload::text) AS "sizeBytes"
       FROM cloud_projects WHERE owner_id = $1 ORDER BY updated_at DESC`,
      [auth.userId],
    )
    return Response.json({ projects: rows }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json(
      { error: 'A nuvem ainda não está pronta. Verifique a configuração e as migrações do banco.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function POST(request: Request) {
  const auth = await requireCloudUser()
  if (!auth.ok) return auth.response

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_PROJECT_BYTES) {
    return Response.json({ error: 'Este projeto excede o limite de 3,5 MB para sincronização.' }, { status: 413 })
  }

  let body: { project?: CloudWorkspaceProject; expectedUpdatedAt?: string | null }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'O conteúdo enviado não é um JSON válido.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'O conteúdo enviado precisa ser um objeto JSON.' }, { status: 400 })
  }

  const project = body.project
  if (
    !project ||
    typeof project.id !== 'string' ||
    !UUID_PATTERN.test(project.id) ||
    typeof project.name !== 'string' ||
    !project.name.trim() ||
    project.name.length > 120 ||
    !Array.isArray(project.tabs) ||
    !Array.isArray(project.backupFiles)
  ) {
    return Response.json({ error: 'O projeto está incompleto ou em formato inválido.' }, { status: 400 })
  }

  const serialized = JSON.stringify(project)
  if (Buffer.byteLength(serialized, 'utf8') > MAX_PROJECT_BYTES) {
    return Response.json({ error: 'Este projeto excede o limite de 3,5 MB para sincronização.' }, { status: 413 })
  }

  const expectedUpdatedAt = body.expectedUpdatedAt ?? null
  if (expectedUpdatedAt !== null && typeof expectedUpdatedAt !== 'string') {
    return Response.json({ error: 'A versão esperada não é válida. Atualize a lista e tente novamente.' }, { status: 400 })
  }

  try {
    const { rows } = await getCloudPool().query(
      `INSERT INTO cloud_projects (owner_id, project_id, name, payload)
       VALUES ($1, $2::uuid, $3, $4::jsonb)
       ON CONFLICT (owner_id, project_id) DO UPDATE
       SET name = EXCLUDED.name, payload = EXCLUDED.payload, updated_at = now()
       WHERE $5::timestamptz IS NOT NULL
         AND date_trunc('milliseconds', cloud_projects.updated_at) = $5::timestamptz
       RETURNING date_trunc('milliseconds', updated_at) AS "updatedAt"`,
      [auth.userId, project.id, project.name.trim(), serialized, expectedUpdatedAt],
    )

    if (rows.length === 0) {
      const latest = await getCloudPool().query(
        `SELECT date_trunc('milliseconds', updated_at) AS "updatedAt"
         FROM cloud_projects WHERE owner_id = $1 AND project_id = $2::uuid`,
        [auth.userId, project.id],
      )
      return Response.json(
        { error: 'A cópia na nuvem mudou desde a última atualização. Atualize a lista para comparar.', updatedAt: latest.rows[0]?.updatedAt ?? null },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return Response.json({ id: project.id, updatedAt: rows[0].updatedAt }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json(
      { error: 'Não foi possível salvar na nuvem. Verifique se a migração do banco foi aplicada.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
