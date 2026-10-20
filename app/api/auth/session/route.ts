import { getAuth0Client } from '@/lib/auth0'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth0 = getAuth0Client()
  if (!auth0) {
    return Response.json(
      { configured: false, authenticated: false, user: null },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const session = await auth0.getSession()
    const user = session?.user
    return Response.json(
      {
        configured: true,
        authenticated: Boolean(user?.sub),
        user: user?.sub
          ? { name: user.name ?? user.nickname ?? 'Conta', email: user.email ?? null, picture: user.picture ?? null }
          : null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return Response.json(
      { configured: true, authenticated: false, user: null, error: 'Não foi possível verificar a sessão.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
