'use client'

import { useRef, useState } from 'react'
import type { WorkspaceProject } from '@/utils/workspaceDb'

interface WorkspaceHubProps {
  projects: WorkspaceProject[]
  activeProjectId: string
  mode: 'script' | 'notebook'
  isReady: boolean
  isBusy: boolean
  lastBackupAt: number | null
  packages: string[]
  storageError: string | null
  onSelectProject: (id: string) => void
  onCreateProject: (name: string) => void
  onDuplicateProject: () => void
  onRenameProject: (name: string) => void
  onDeleteProject: () => void
  onExportProject: () => void
  onDeleteBackup: () => void
  onImportProject: (file: File) => void
  onModeChange: (mode: 'script' | 'notebook') => void
  onOpenLearning: () => void
  onOpenHistory: () => void
  onResetWorkspace: () => void
}

const controlClass = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-50'
const menuItemClass = 'w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:text-gray-200 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50'

export function WorkspaceHub(props: WorkspaceHubProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const projectMenuRef = useRef<HTMLDetailsElement>(null)
  const [newName, setNewName] = useState('')
  const activeProject = props.projects.find((project) => project.id === props.activeProjectId)

  const closeProjectMenu = () => {
    if (projectMenuRef.current) projectMenuRef.current.open = false
  }

  const runProjectAction = (action: () => void) => {
    closeProjectMenu()
    action()
  }

  const createProject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return

    props.onCreateProject(name)
    setNewName('')
    closeProjectMenu()
  }

  const backupTime = props.lastBackupAt ? new Date(props.lastBackupAt) : null

  return (
    <>
      <div className="flex flex-col gap-3 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_auto] sm:flex sm:flex-wrap sm:items-center">
          <label className="col-span-full text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:col-auto" htmlFor="workspace-project-select">
            Projeto
          </label>
          <div className="relative min-w-0 sm:w-auto sm:flex-none">
            <select
              id="workspace-project-select"
              value={props.activeProjectId}
              disabled={!props.isReady || props.isBusy || props.projects.length === 0}
              onChange={(event) => props.onSelectProject(event.target.value)}
              className="min-h-10 w-full min-w-0 truncate appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-9 text-sm font-semibold text-gray-800 outline-none transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9 sm:w-auto sm:max-w-[220px]"
              aria-label="Projeto ativo"
            >
              {props.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </div>

          <details ref={projectMenuRef} className="group relative min-w-0 justify-self-stretch min-[360px]:justify-self-end sm:justify-self-auto">
            <summary className={`${controlClass} w-full list-none [&::-webkit-details-marker]:hidden min-[360px]:w-auto sm:min-h-9`} aria-label="Gerenciar projeto">
              <span>Gerenciar</span>
              <svg className="h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:left-0 sm:right-auto sm:max-w-[calc(100vw-2rem)]">
              <form onSubmit={createProject} className="border-b border-gray-100 p-2 dark:border-gray-800">
                <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300" htmlFor="new-project-name">
                  Criar projeto
                </label>
                <div className="flex gap-2">
                  <input
                    id="new-project-name"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="Nome do projeto"
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  />
                  <button type="submit" disabled={!props.isReady || props.isBusy || !newName.trim()} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50">
                    Criar
                  </button>
                </div>
              </form>

              <div className="py-1" role="group" aria-label="Ações do projeto">
                <button type="button" className={menuItemClass} disabled={!props.isReady || props.isBusy || !activeProject} onClick={() => runProjectAction(props.onDuplicateProject)}>
                  Duplicar projeto
                </button>
                <button type="button" className={menuItemClass} disabled={!props.isReady || props.isBusy || !activeProject} onClick={() => runProjectAction(() => {
                  const name = window.prompt('Novo nome do projeto', activeProject?.name ?? '')
                  if (name?.trim()) props.onRenameProject(name.trim())
                })}>
                  Renomear projeto
                </button>
                <button type="button" className={menuItemClass} disabled={!props.isReady || props.isBusy || !activeProject} onClick={() => runProjectAction(props.onExportProject)}>
                  Exportar projeto (.zip)
                </button>
                <button type="button" className={menuItemClass} disabled={!props.isReady || props.isBusy} onClick={() => runProjectAction(() => fileInputRef.current?.click())}>
                  Importar projeto (.zip)
                </button>
              </div>

              <div className="border-t border-gray-100 pt-1 dark:border-gray-800">
                <button type="button" className={`${menuItemClass} text-red-700 hover:bg-red-50 focus:ring-red-500 dark:text-red-300 dark:hover:bg-red-950/30`} disabled={!props.isReady || props.isBusy || !activeProject} onClick={() => runProjectAction(() => {
                  if (window.confirm(`Excluir o projeto “${activeProject?.name}”? Esta ação não pode ser desfeita.`)) props.onDeleteProject()
                })}>
                  Excluir projeto
                </button>
                <button type="button" className={`${menuItemClass} text-amber-700 hover:bg-amber-50 focus:ring-amber-500 dark:text-amber-300 dark:hover:bg-amber-950/30`} disabled={!props.isReady || props.isBusy} onClick={() => runProjectAction(props.onResetWorkspace)}>
                  Limpar workspace deste projeto
                </button>
              </div>
            </div>
          </details>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-950" role="group" aria-label="Modo do editor">
            <button type="button" disabled={props.isBusy} onClick={() => props.onModeChange('script')} aria-pressed={props.mode === 'script'} className={`min-h-8 rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-50 ${props.mode === 'script' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'}`}>
              Script
            </button>
            <button type="button" disabled={props.isBusy} onClick={() => props.onModeChange('notebook')} aria-pressed={props.mode === 'notebook'} className={`min-h-8 rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-50 ${props.mode === 'notebook' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'}`}>
              Notebook
            </button>
          </div>
          <button type="button" disabled={props.isBusy} className={controlClass} onClick={props.onOpenLearning} title="Abrir trilha de aprendizagem">
            Aprender
          </button>
          <button type="button" disabled={props.isBusy} className={controlClass} onClick={props.onOpenHistory}>
            Histórico
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) props.onImportProject(file)
          event.target.value = ''
        }}
        aria-label="Selecionar arquivo de projeto ZIP"
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 bg-gray-50/70 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5" title={props.packages.join(', ')}>
          <span className="font-medium text-gray-700 dark:text-gray-300">Pacotes</span>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 tabular-nums dark:bg-gray-800">{props.packages.length}</span>
        </span>
        <span aria-live="polite">
          {backupTime ? <>Arquivos do workspace salvos às <time dateTime={backupTime.toISOString()}>{backupTime.toLocaleTimeString()}</time></> : 'Backup de arquivos pendente'}
        </span>
        {props.storageError && <span role="status" className="text-amber-700 dark:text-amber-300">Armazenamento local: {props.storageError}</span>}

        <details className="group relative ml-auto">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1 font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-300 dark:hover:bg-gray-900 [&::-webkit-details-marker]:hidden">
            Detalhes do ambiente
            <svg className="h-3.5 w-3.5 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </summary>
          <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <p className="font-semibold text-gray-800 dark:text-gray-100">Manifesto de pacotes</p>
            <p className="mt-1 break-words text-gray-600 dark:text-gray-400">
              {props.packages.length ? props.packages.join(', ') : 'Nenhum pacote registrado.'}
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Pacotes instalados não são reinstalados automaticamente ao restaurar um projeto.</p>
            {backupTime && (
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                <span className="text-xs text-gray-500 dark:text-gray-400">Backup deste projeto</span>
                <button type="button" className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-300 dark:hover:bg-red-950/30" onClick={() => {
                  if (window.confirm('Remover o backup salvo deste projeto? Os arquivos atuais no runtime não serão alterados.')) props.onDeleteBackup()
                }}>
                  Remover backup
                </button>
              </div>
            )}
          </div>
        </details>
      </div>
    </>
  )
}
