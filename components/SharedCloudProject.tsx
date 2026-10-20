'use client'

import { useEffect, useState } from 'react'
import { deserializeWorkspaceProject } from '@/utils/cloudProject'
import { saveWorkspaceProject } from '@/utils/workspaceDb'

interface SharedCloudProjectProps {
  token: string
}

export function SharedCloudProject({ token }: SharedCloudProjectProps) {
  const [project, setProject] = useState<ReturnType<typeof deserializeWorkspaceProject>>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const response = await fetch(`/api/cloud/share/${encodeURIComponent(token)}`, { cache: 'no-store' })
        const result = await response.json().catch(() => ({})) as Record<string, unknown>
        if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Não foi possível abrir o compartilhamento.')
        const remoteProject = deserializeWorkspaceProject(result.project, String(result.updatedAt ?? ''))
        if (!remoteProject) throw new Error('O projeto compartilhado tem um formato inválido.')
        if (active) {
          setProject(remoteProject)
          setExpiresAt(typeof result.expiresAt === 'string' ? result.expiresAt : null)
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Não foi possível abrir o compartilhamento.')
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => { active = false }
  }, [token])

  const importProject = async () => {
    if (!project) return
    setIsImporting(true)
    try {
      const imported = {
        ...project,
        id: crypto.randomUUID(),
        name: `${project.name} (compartilhado)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await saveWorkspaceProject(imported)
      localStorage.setItem('interpreta-python-active-project', imported.id)
      window.location.assign('/')
    } catch {
      setError('Não foi possível salvar a cópia neste navegador.')
      setIsImporting(false)
    }
  }

  const expiryText = expiresAt
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(expiresAt))
    : null

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" aria-hidden="true">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-4-4v8M7 3h10a2 2 0 012 2v14l-3-2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Projeto Python compartilhado</h1>

        {isLoading && <p className="mt-4 text-sm text-gray-600 dark:text-gray-300" role="status">Carregando projeto…</p>}
        {error && <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" role="alert">{error}</p>}

        {!isLoading && project && (
          <>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">O link dá acesso somente de leitura a uma cópia do projeto. Importá-lo salva uma cópia no seu navegador, sem substituir projetos existentes.</p>
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Projeto</p>
              <p className="mt-1 break-words text-base font-semibold text-gray-900 dark:text-gray-100">{project.name}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{project.tabs.length} aba(s) · {project.backupFiles.length} arquivo(s) virtual(is){expiryText ? ` · link expira em ${expiryText}` : ''}</p>
            </div>
            <button type="button" onClick={() => void importProject()} disabled={isImporting} className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-gray-900">
              {isImporting ? 'Salvando no navegador…' : 'Importar cópia para o meu navegador'}
            </button>
          </>
        )}
        <a href="/" className="mt-4 inline-flex text-sm font-medium text-blue-700 hover:underline dark:text-blue-300">Voltar ao Interpretador</a>
      </section>
    </main>
  )
}
