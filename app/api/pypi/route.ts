import { NextRequest, NextResponse } from 'next/server'

interface PyPIProjectResponse {
  info?: {
    name?: string
    version?: string
    summary?: string
    requires_python?: string | null
    project_urls?: Record<string, string> | null
  }
}

const PACKAGE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/

export async function GET(request: NextRequest) {
  const packageName = request.nextUrl.searchParams.get('name')?.trim()

  if (!packageName || !PACKAGE_NAME_PATTERN.test(packageName)) {
    return NextResponse.json({ error: 'Informe o nome exato de um pacote válido.' }, { status: 400 })
  }

  try {
    const response = await fetch(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 3600 },
    })

    if (response.status === 404) {
      return NextResponse.json({ error: `O pacote “${packageName}” não foi encontrado no PyPI.` }, { status: 404 })
    }
    if (!response.ok) {
      return NextResponse.json({ error: 'O PyPI não respondeu à consulta agora. Tente novamente.' }, { status: 503 })
    }

    const payload = await response.json() as PyPIProjectResponse
    const info = payload.info
    if (!info?.name || !info.version) {
      return NextResponse.json({ error: 'O PyPI retornou metadados incompletos para este pacote.' }, { status: 502 })
    }

    return NextResponse.json({
      name: info.name,
      version: info.version,
      summary: info.summary ?? '',
      requiresPython: info.requires_python ?? null,
      projectUrls: info.project_urls ?? {},
      compatibleWithPyodide: null,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError'
    return NextResponse.json({
      error: isTimeout ? 'A consulta ao PyPI demorou demais. Tente novamente.' : 'Não foi possível consultar o PyPI.',
    }, { status: 503 })
  }
}
