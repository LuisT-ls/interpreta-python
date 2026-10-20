import { attachDatabasePool } from '@vercel/functions'
import { Pool } from 'pg'

declare global {
  // Reuse one small pool across requests handled by the same Node.js instance.
  var interpretaPythonCloudPool: Pool | undefined
}

export function getCloudPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('Cloud database is not configured.')
  }

  if (!globalThis.interpretaPythonCloudPool) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    })
    attachDatabasePool(pool)
    globalThis.interpretaPythonCloudPool = pool
  }

  return globalThis.interpretaPythonCloudPool
}
