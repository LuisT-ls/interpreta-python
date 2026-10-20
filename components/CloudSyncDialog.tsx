'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog'
import { deserializeWorkspaceProject, serializeWorkspaceProject } from '@/utils/cloudProject'
import type { WorkspaceProject } from '@/utils/workspaceDb'

interface CloudSyncDialogProps {
  isOpen: boolean
  onClose: () => void
  currentProject: WorkspaceProject | null
  getCurrentProject: () => Promise<WorkspaceProject | null>
  onImportProject: (project: WorkspaceProject) => Promise<boolean>
}

interface CloudSession {
  configured: boolean
  authenticated: boolean
  user: { name: string; email: string | null } | null
}

interface CloudProjectSummary {
  id: string
  name: string
  updatedAt: string
  sizeBytes: number
}

async function readJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>
}

function formatDate(value: string | number) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'data desconhecida'
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function CloudSyncDialog({
  isOpen,
  onClose,
  currentProject,
  getCurrentProject,
  onImportProject,
}: CloudSyncDialogProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const [session, setSession] = useState<CloudSession | null>(null)
  const [cloudProjects, setCloudProjects] = useState<CloudProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null)
  const [confirmOverwriteId, setConfirmOverwriteId] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [messageIsError, setMessageIsError] = useState(false)
  useAccessibleDialog(isOpen, onClose, dialogRef)

  useEffect(() => {
    setShareUrl(null)
    setShareExpiresAt(null)
  }, [currentProject?.id])

  const refreshProjects = useCallback(async () => {
    const response = await fetch('/api/cloud/projects', { cache: 'no-store' })
    const result = await readJson(response)
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Não foi possível carregar os projetos da nuvem.')
    const projects = Array.isArray(result.projects) ? result.projects as CloudProjectSummary[] : []
    setCloudProjects(projects)
    return projects
  }, [])

  useEffect(() => {
    if (!isOpen) return
    let active = true
    setIsLoading(true)
    setMessage(null)
    setConfirmOverwriteId(null)

    void (async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' })
        const result = await readJson(response)
        if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Não foi possível verificar a conta.')
        const nextSession: CloudSession = {
          configured: result.configured === true,
          authenticated: result.authenticated === true,
          user: result.user && typeof result.user === 'object'
            ? result.user as CloudSession['user']
            : null,
        }
        if (!active) return
        setSession(nextSession)
        if (nextSession.authenticated) await refreshProjects()
      } catch (loadError) {
        if (active) {
          setMessage(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o estado da nuvem.')
          setMessageIsError(true)
        }
      } finally {
        if (active) setIsLoading(false)
      }
    })()

    return () => { active = false }
  }, [isOpen, refreshProjects])

  const remoteCurrentProject = useMemo(
    () => currentProject ? cloudProjects.find((project) => project.id === currentProject.id) ?? null : null,
    [currentProject, cloudProjects],
  )
  const saveCurrentProject = useCallback(async (confirmOverwrite = false) => {
    setMessage(null)
    setMessageIsError(false)
    setConfirmOverwriteId(null)
    const project = await getCurrentProject()
    if (!project) {
      setMessage('Não foi possível preparar o projeto atual para sincronização.')
      setMessageIsError(true)
      return
    }

    const latestRemote = cloudProjects.find((item) => item.id === project.id) ?? null
    const remoteIsNewer = latestRemote && Date.parse(latestRemote.updatedAt) > project.updatedAt
    if (remoteIsNewer && !confirmOverwrite) {
      setConfirmOverwriteId(project.id)
      return
    }

    setBusyProjectId(project.id)
    try {
      const response = await fetch('/api/cloud/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: serializeWorkspaceProject(project),
          expectedUpdatedAt: latestRemote?.updatedAt ?? null,
        }),
      })
      const result = await readJson(response)
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Não foi possível salvar o projeto na nuvem.')
      await refreshProjects()
      setMessage('Projeto salvo na nuvem. A cópia local continua disponível neste navegador.')
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : 'Não foi possível salvar o projeto na nuvem.')
      setMessageIsError(true)
      if (saveError instanceof Error && saveError.message.includes('mudou desde')) {
        await refreshProjects().catch(() => {})
      }
    } finally {
      setBusyProjectId(null)
    }
  }, [cloudProjects, getCurrentProject, refreshProjects])

  const downloadProject = useCallback(async (summary: CloudProjectSummary) => {
    setBusyProjectId(summary.id)
    setMessage(null)
    setMessageIsError(false)
    try {
      const response = await fetch(`/api/cloud/projects/${encodeURIComponent(summary.id)}`, { cache: 'no-store' })
      const result = await readJson(response)
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Não foi possível baixar o projeto.')
      const project = deserializeWorkspaceProject(result.project, String(result.updatedAt ?? summary.updatedAt))
      if (!project) throw new Error('A cópia remota não tem um formato de projeto reconhecido.')

      const imported = {
        ...project,
        id: crypto.randomUUID(),
        name: `${project.name} (nuvem)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      if (!await onImportProject(imported)) throw new Error('O navegador não conseguiu salvar a cópia importada.')
      setMessage('Projeto baixado como uma cópia local. Nenhum projeto existente foi substituído.')
    } catch (downloadError) {
      setMessage(downloadError instanceof Error ? downloadError.message : 'Não foi possível baixar o projeto.')
      setMessageIsError(true)
    } finally {
      setBusyProjectId(null)
    }
  }, [onImportProject])

  const createShareLink = useCallback(async () => {
    if (!currentProject || !remoteCurrentProject) return
    setBusyProjectId(currentProject.id)
    setMessage(null)
    setMessageIsError(false)
    try {
      const response = await fetch(`/api/cloud/projects/${encodeURIComponent(currentProject.id)}/share`, { method: 'POST' })
      const result = await readJson(response)
      if (!response.ok || typeof result.url !== 'string') {
        throw new Error(typeof result.error === 'string' ? result.error : 'Não foi possível criar o link de compartilhamento.')
      }
      setShareUrl(result.url)
      setShareExpiresAt(typeof result.expiresAt === 'string' ? result.expiresAt : null)
      try {
        await navigator.clipboard.writeText(result.url)
        setMessage('Link somente leitura copiado. Qualquer pessoa com o link poderá importar uma cópia por 30 dias.')
      } catch {
        setMessage('Link criado. Copie-o no campo abaixo; qualquer pessoa com o link poderá importar uma cópia por 30 dias.')
      }
    } catch (shareError) {
      setMessage(shareError instanceof Error ? shareError.message : 'Não foi possível criar o link de compartilhamento.')
      setMessageIsError(true)
    } finally {
      setBusyProjectId(null)
    }
  }, [currentProject, remoteCurrentProject])

  const revokeShareLink = useCallback(async () => {
    if (!currentProject) return
    setBusyProjectId(currentProject.id)
    setMessage(null)
    try {
      const response = await fetch(`/api/cloud/projects/${encodeURIComponent(currentProject.id)}/share`, { method: 'DELETE' })
      const result = await readJson(response)
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Não foi possível revogar o link.')
      setShareUrl(null)
      setShareExpiresAt(null)
      setMessage('O link de compartilhamento foi revogado.')
    } catch (revokeError) {
      setMessage(revokeError instanceof Error ? revokeError.message : 'Não foi possível revogar o link.')
      setMessageIsError(true)
    } finally {
      setBusyProjectId(null)
    }
  }, [currentProject])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busyProjectId) onClose() }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-sync-title"
        aria-describedby="cloud-sync-description"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <header className="flex items-start justify-between border-b border-gray-200 p-5 dark:border-gray-700 sm:p-6">
          <div>
            <h2 id="cloud-sync-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">Conta e projetos na nuvem</h2>
            <p id="cloud-sync-description" className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Sincronize cópias dos seus projetos entre navegadores, sob demanda.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar conta e nuvem" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-gray-800">
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {isLoading && <p className="text-sm text-gray-600 dark:text-gray-300" role="status">Verificando sua conta…</p>}

          {!isLoading && session && !session.configured && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100" role="status">
              A autenticação está provisionada no Vercel, mas não foi configurada neste ambiente. No deploy, confirme as variáveis Auth0 de Production; para desenvolvimento local, atualize o ambiente depois que o Vercel estiver acessível.
            </div>
          )}

          {!isLoading && session?.configured && !session.authenticated && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="text-sm leading-6 text-blue-950 dark:text-blue-100">Entre para salvar uma cópia privada dos projetos na sua conta. O código continua salvo localmente mesmo sem login.</p>
              <a href="/auth/login?returnTo=%2F" className="mt-3 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-blue-950">Entrar ou criar conta</a>
            </div>
          )}

          {session?.authenticated && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{session.user?.name ?? 'Conta conectada'}</p>
                {session.user?.email && <p className="truncate text-xs text-gray-600 dark:text-gray-300">{session.user.email}</p>}
              </div>
              <a href="/auth/logout?returnTo=%2F" className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Sair</a>
            </div>
          )}

          {session?.authenticated && (
            <section aria-labelledby="cloud-projects-heading">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 id="cloud-projects-heading" className="text-sm font-bold text-gray-900 dark:text-gray-100">Projetos da nuvem</h3>
                <button type="button" onClick={() => { setIsLoading(true); void refreshProjects().catch((error: unknown) => { setMessage(error instanceof Error ? error.message : 'Falha ao atualizar.'); setMessageIsError(true) }).finally(() => setIsLoading(false)) }} disabled={isLoading || Boolean(busyProjectId)} className="rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-300 dark:hover:bg-blue-950/50">Atualizar lista</button>
              </div>

              {currentProject && (
                <div className="mb-4 rounded-xl border border-blue-200 p-4 dark:border-blue-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Projeto local atual</p>
                      <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{currentProject.name}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {remoteCurrentProject
                          ? `Nuvem atualizada em ${formatDate(remoteCurrentProject.updatedAt)}`
                          : 'Ainda não existe uma cópia deste projeto na nuvem.'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Local atualizado em {formatDate(currentProject.updatedAt)}</p>
                    </div>
                    {!confirmOverwriteId && (
                      <button type="button" onClick={() => void saveCurrentProject()} disabled={Boolean(busyProjectId) || isLoading} className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                        {busyProjectId === currentProject.id ? 'Salvando…' : remoteCurrentProject ? 'Atualizar na nuvem' : 'Salvar na nuvem'}
                      </button>
                    )}
                  </div>
                  {confirmOverwriteId === currentProject.id && (
                    <div className="mt-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/40">
                      <p className="text-xs leading-5 text-amber-950 dark:text-amber-100">A nuvem tem uma versão mais recente. Confirmar vai substituí-la pela versão local atual. A cópia local não será alterada.</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" onClick={() => void saveCurrentProject(true)} disabled={Boolean(busyProjectId)} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50">Confirmar substituição da cópia na nuvem</button>
                        <button type="button" onClick={() => setConfirmOverwriteId(null)} disabled={Boolean(busyProjectId)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentProject && remoteCurrentProject && (
                <div className="mb-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Compartilhar projeto</p>
                  <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">Cria um link somente leitura por 30 dias. Gerar outro link revoga o anterior; você também pode revogá-lo agora.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void createShareLink()} disabled={Boolean(busyProjectId)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                      {shareUrl ? 'Gerar novo link' : 'Criar link somente leitura'}
                    </button>
                    <button type="button" onClick={() => void revokeShareLink()} disabled={Boolean(busyProjectId)} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40">Revogar link</button>
                  </div>
                  {shareUrl && (
                    <div className="mt-3 space-y-1">
                      <label htmlFor="cloud-share-url" className="text-xs text-gray-600 dark:text-gray-300">Link privado{shareExpiresAt ? ` · expira em ${formatDate(shareExpiresAt)}` : ''}</label>
                      <input id="cloud-share-url" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
                    </div>
                  )}
                </div>
              )}

              {cloudProjects.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Nenhum projeto salvo na nuvem ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {cloudProjects.map((project) => (
                    <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{project.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Atualizado {formatDate(project.updatedAt)} · {(project.sizeBytes / 1024).toFixed(0)} KB</p>
                      </div>
                      <button type="button" onClick={() => void downloadProject(project)} disabled={Boolean(busyProjectId) || isLoading} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                        {busyProjectId === project.id ? 'Baixando…' : 'Baixar como cópia local'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {message && (
            <p role="status" aria-live="polite" className={`rounded-lg border p-3 text-sm ${messageIsError ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200' : 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'}`}>
              {message}
            </p>
          )}
        </div>

        <footer className="border-t border-gray-200 px-5 py-3 text-xs leading-5 text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:px-6">
          A sincronização da sua conta é manual e privada. Links compartilhados são somente leitura, expiram em 30 dias e podem ser revogados; isso não habilita edição simultânea. Projetos com mais de 3,5 MB não podem ser enviados; exporte um arquivo ZIP como alternativa.
        </footer>
      </section>
    </div>
  )
}
