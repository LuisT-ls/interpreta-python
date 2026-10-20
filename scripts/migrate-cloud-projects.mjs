import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import nextEnv from '@next/env'
import pg from 'pg'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const connectionString = process.env.DATABASE_URL_UNPOOLED
if (!connectionString) {
  throw new Error('Defina DATABASE_URL_UNPOOLED para aplicar migrações com conexão direta.')
}

const migrationVersions = ['001_cloud_projects', '002_cloud_share_snapshots']
const client = new pg.Client({ connectionString })

try {
  await client.connect()
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  for (const migrationVersion of migrationVersions) {
    await client.query('BEGIN')
    try {
      const existing = await client.query('SELECT 1 FROM app_schema_migrations WHERE version = $1', [migrationVersion])
      if (existing.rowCount === 0) {
        const migrationSql = await readFile(join(process.cwd(), `db/migrations/${migrationVersion}.sql`), 'utf8')
        await client.query(migrationSql)
        await client.query('INSERT INTO app_schema_migrations (version) VALUES ($1)', [migrationVersion])
      }
      await client.query('COMMIT')
      process.stdout.write(`Migração ${migrationVersion}: aplicada ou já existente.\n`)
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    }
  }
} finally {
  await client.end()
}
