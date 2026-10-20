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

const buttonClass = 'rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'

export function WorkspaceHub(props: WorkspaceHubProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newName, setNewName] = useState('')
  const activeProject = props.projects.find((project) => project.id === props.activeProjectId)

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900" aria-label="Workspace e recursos de aprendizagem">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="workspace-project-select">Projeto ativo</label>
        <select
          id="workspace-project-select"
          value={props.activeProjectId}
          disabled={!props.isReady || props.isBusy || props.projects.length === 0}
          onChange={(event) => props.onSelectProject(event.target.value)}
          className="max-w-[180px] rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          aria-label="Projeto ativo"
        >
          {props.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && newName.trim()) {
              props.onCreateProject(newName.trim())
              setNewName('')
            }
          }}
          placeholder="Nome do novo projeto"
          aria-label="Nome do novo projeto"
          className="w-36 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <button type="button" disabled={!props.isReady || props.isBusy} className={buttonClass} onClick={() => {
          if (newName.trim()) props.onCreateProject(newName.trim())
          else props.onCreateProject('Novo projeto')
          setNewName('')
        }}>Novo projeto</button>
        <button type="button" className={buttonClass} disabled={!props.isReady || props.isBusy || !activeProject} onClick={props.onDuplicateProject}>Duplicar</button>
        <button type="button" className={buttonClass} disabled={!props.isReady || props.isBusy || !activeProject} onClick={() => {
          const name = window.prompt('Novo nome do projeto', activeProject?.name ?? '')
          if (name?.trim()) props.onRenameProject(name)
        }}>Renomear</button>
        <button type="button" className={buttonClass} disabled={!props.isReady || props.isBusy || !activeProject} onClick={() => {
          if (window.confirm(`Excluir o projeto “${activeProject?.name}”? Esta ação não pode ser desfeita.`)) props.onDeleteProject()
        }}>Excluir</button>
        <button type="button" className={buttonClass} disabled={!props.isReady || props.isBusy || !activeProject} onClick={props.onExportProject}>Exportar .zip</button>
        <button type="button" className={buttonClass} disabled={!props.isReady || props.isBusy} onClick={() => fileInputRef.current?.click()}>Importar .zip</button>
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

        <span className="mx-1 hidden h-6 w-px bg-gray-200 sm:inline-block dark:bg-gray-700" aria-hidden="true" />
        <div className="flex rounded-md border border-gray-200 p-0.5 dark:border-gray-700" role="group" aria-label="Modo do editor">
          <button type="button" disabled={props.isBusy} onClick={() => props.onModeChange('script')} aria-pressed={props.mode === 'script'} className={`rounded px-2.5 py-1 text-xs disabled:opacity-50 ${props.mode === 'script' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>Script</button>
          <button type="button" disabled={props.isBusy} onClick={() => props.onModeChange('notebook')} aria-pressed={props.mode === 'notebook'} className={`rounded px-2.5 py-1 text-xs disabled:opacity-50 ${props.mode === 'notebook' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>Notebook</button>
        </div>
        <button type="button" disabled={props.isBusy} className={buttonClass} onClick={props.onOpenLearning}>Trilha de aprendizagem</button>
        <button type="button" disabled={props.isBusy} className={buttonClass} onClick={props.onOpenHistory}>Histórico</button>
        <button
          type="button"
          disabled={!props.isReady || props.isBusy}
          className={`${buttonClass} !border-red-200 !text-red-700 hover:!bg-red-50 dark:!border-red-900 dark:!text-red-300 dark:hover:!bg-red-950/40`}
          onClick={props.onResetWorkspace}
          aria-label="Limpar workspace deste projeto"
        >
          Limpar workspace
        </button>

        <span className="ml-auto min-w-fit text-[11px] text-gray-500 dark:text-gray-400" aria-live="polite">
          {props.lastBackupAt ? `Backup ${new Date(props.lastBackupAt).toLocaleTimeString()}` : 'Backup aguardando arquivos'}
        </span>
        {props.lastBackupAt && <button type="button" className={`${buttonClass} !px-2 !py-1`} onClick={() => {
          if (window.confirm('Remover o backup salvo deste projeto? Os arquivos atuais no runtime não serão alterados.')) props.onDeleteBackup()
        }}>Remover backup</button>}
      </div>
      <p className="mt-2 px-1 text-[11px] text-gray-500 dark:text-gray-400" title={props.packages.join(', ')}>
        Manifesto de pacotes: {props.packages.length ? props.packages.join(', ') : 'nenhum registrado'}. Pacotes não são reinstalados automaticamente.
      </p>
      {props.storageError && <p role="status" className="mt-2 px-1 text-xs text-amber-700 dark:text-amber-300">Armazenamento local: {props.storageError}</p>}
    </section>
  )
}
