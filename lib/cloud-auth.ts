import { getAuth0Client } from '@/lib/auth0'

export async function requireCloudUser(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response }
> {
  const auth0 = getAuth0Client()
  if (!auth0) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Autenticação ainda não está configurada neste ambiente.' },
        { status: 503 },
      ),
    }
  }

  const session = await auth0.getSession()
  const userId = session?.user?.sub
  if (typeof userId !== 'string' || !userId) {
    return {
      ok: false,
      response: Response.json({ error: 'Entre na sua conta para acessar a nuvem.' }, { status: 401 }),
    }
  }

  return { ok: true, userId }
}
