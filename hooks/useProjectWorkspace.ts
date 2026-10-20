'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { EditorTab } from '@/hooks/useEditorTabs'
import type { LayoutType } from '@/hooks/useLayout'
import {
  deleteWorkspaceProject,
  listWorkspaceProjects,
  saveWorkspaceProject,
  type NotebookCell,
  type WorkspaceProject,
} from '@/utils/workspaceDb'

export type WorkspaceDraft = Omit<WorkspaceProject, 'id' | 'name' | 'createdAt' | 'updatedAt'>

interface UseProjectWorkspaceOptions {
  workspace: WorkspaceDraft
  onRestore: (project: WorkspaceProject) => void
}

const ACTIVE_PROJECT_KEY = 'interpreta-python-active-project'

export function createEmptyProject(name: string, tabs: EditorTab[], settings?: { layout: LayoutType; fontSize: number }): WorkspaceProject {
  const now = Date.now()
  const firstTab = tabs[0] ?? {
    id: crypto.randomUUID(),
    name: 'editor.py',
    code: '',
    output: '',
    hasError: false,
    plots: [],
  }
  const initialCell: NotebookCell = {
    id: crypto.randomUUID(),
    code: firstTab.code,
    output: '',
    hasError: false,
    plots: [],
  }

  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    tabs: [{ ...firstTab, output: '', hasError: false, plots: firstTab.plots ?? [] }],
    activeTabId: firstTab.id,
    mode: 'script',
    settings: settings ?? { layout: 'right', fontSize: 14 },
    cells: [initialCell],
    history: [],
    completedLessons: [],
    packages: [],
    backupFiles: [],
    lastBackupAt: null,
  }
}

function normalizeProject(project: WorkspaceProject): WorkspaceProject {
  const tabs = Array.isArray(project.tabs) && project.tabs.length > 0 ? project.tabs : createEmptyProject(project.name, []).tabs
  const normalizedTabs = tabs.map((tab) => ({ ...tab, plots: tab.plots ?? [] }))
  const cells = Array.isArray(project.cells) && project.cells.length > 0
    ? project.cells.map((cell) => ({ ...cell, plots: cell.plots ?? [] }))
    : [{ id: crypto.randomUUID(), code: normalizedTabs[0].code, output: '', hasError: false, plots: [] }]

  return {
    ...project,
    tabs: normalizedTabs,
    activeTabId: normalizedTabs.some((tab) => tab.id === project.activeTabId) ? project.activeTabId : normalizedTabs[0].id,
    mode: project.mode === 'notebook' ? 'notebook' : 'script',
    settings: {
      layout: ['bottom', 'right', 'left', 'top'].includes(project.settings?.layout) ? project.settings.layout : 'right',
      fontSize: Number.isFinite(project.settings?.fontSize) ? Math.min(24, Math.max(10, project.settings.fontSize)) : 14,
    },
    cells,
    history: Array.isArray(project.history) ? project.history : [],
    completedLessons: Array.isArray(project.completedLessons) ? project.completedLessons : [],
    packages: Array.isArray(project.packages) ? project.packages : [],
    backupFiles: Array.isArray(project.backupFiles) ? project.backupFiles : [],
    lastBackupAt: project.lastBackupAt ?? null,
  }
}

export function useProjectWorkspace({ workspace, onRestore }: UseProjectWorkspaceOptions) {
  const [projects, setProjects] = useState<WorkspaceProject[]>([])
  const [activeProjectId, setActiveProjectId] = useState('')
  const [isReady, setIsReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const workspaceRef = useRef(workspace)
  const onRestoreRef = useRef(onRestore)
  const projectsRef = useRef(projects)

  useEffect(() => { workspaceRef.current = workspace }, [workspace])
  useEffect(() => { onRestoreRef.current = onRestore }, [onRestore])
  useEffect(() => { projectsRef.current = projects }, [projects])

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      try {
        const savedProjects = (await listWorkspaceProjects()).map(normalizeProject)
        if (cancelled) return
        if (savedProjects.length === 0) {
          const initial = createEmptyProject('Meu projeto', workspaceRef.current.tabs)
          const migrated: WorkspaceProject = normalizeProject({
            ...initial,
            ...workspaceRef.current,
            id: initial.id,
            name: initial.name,
            createdAt: initial.createdAt,
            updatedAt: initial.updatedAt,
          })
          await saveWorkspaceProject(migrated)
          if (cancelled) return
          setProjects([migrated])
          setActiveProjectId(migrated.id)
          localStorage.setItem(ACTIVE_PROJECT_KEY, migrated.id)
          onRestoreRef.current(migrated)
        } else {
          const savedId = localStorage.getItem(ACTIVE_PROJECT_KEY)
          const active = savedProjects.find((project) => project.id === savedId) ?? savedProjects[0]
          setProjects(savedProjects)
          setActiveProjectId(active.id)
          localStorage.setItem(ACTIVE_PROJECT_KEY, active.id)
          onRestoreRef.current(active)
        }
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : 'Não foi possível abrir o armazenamento local.')
        const fallback = createEmptyProject('Meu projeto', workspaceRef.current.tabs)
        if (!cancelled) {
          setProjects([fallback])
          setActiveProjectId(fallback.id)
          onRestoreRef.current(fallback)
        }
      } finally {
        if (!cancelled) setIsReady(true)
      }
    }

    void initialize()
    return () => { cancelled = true }
  }, [])

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  )

  const persistCurrent = useCallback(async () => {
    const existing = projectsRef.current.find((project) => project.id === activeProjectId)
    if (!existing) return null
    const updated = { ...existing, ...workspaceRef.current, updatedAt: Date.now() }
    try {
      await saveWorkspaceProject(updated)
      setProjects((current) => current.map((project) => project.id === updated.id ? updated : project))
      setStorageError(null)
      return updated
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Não foi possível salvar o projeto.')
      return null
    }
  }, [activeProjectId])

  useEffect(() => {
    if (!isReady || !activeProjectId) return
    const timeout = window.setTimeout(() => { void persistCurrent() }, 650)
    return () => window.clearTimeout(timeout)
  }, [workspace, isReady, activeProjectId, persistCurrent])

  const selectProject = useCallback(async (projectId: string) => {
    if (projectId === activeProjectId) return
    await persistCurrent()
    const target = projectsRef.current.find((project) => project.id === projectId)
    if (!target) return
    const normalized = normalizeProject(target)
    setActiveProjectId(projectId)
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId)
    onRestoreRef.current(normalized)
  }, [activeProjectId, persistCurrent])

  const createProject = useCallback(async (name: string) => {
    await persistCurrent()
    const project = createEmptyProject(name.trim() || 'Novo projeto', [], workspaceRef.current.settings)
    try {
      await saveWorkspaceProject(project)
      setProjects((current) => [...current, project])
      setActiveProjectId(project.id)
      localStorage.setItem(ACTIVE_PROJECT_KEY, project.id)
      onRestoreRef.current(project)
      setStorageError(null)
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Não foi possível criar o projeto.')
    }
  }, [persistCurrent])

  const duplicateProject = useCallback(async () => {
    const current = await persistCurrent()
    if (!current) return
    const now = Date.now()
    const duplicate = {
      ...current,
      id: crypto.randomUUID(),
      name: `${current.name} (cópia)`,
      createdAt: now,
      updatedAt: now,
    }
    try {
      await saveWorkspaceProject(duplicate)
      setProjects((items) => [...items, duplicate])
      setActiveProjectId(duplicate.id)
      localStorage.setItem(ACTIVE_PROJECT_KEY, duplicate.id)
      onRestoreRef.current(duplicate)
      setStorageError(null)
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Não foi possível duplicar o projeto.')
    }
  }, [persistCurrent])

  const renameProject = useCallback(async (name: string) => {
    const existing = projectsRef.current.find((project) => project.id === activeProjectId)
    if (!existing || !name.trim()) return
    const renamed = { ...existing, name: name.trim(), updatedAt: Date.now() }
    try {
      await saveWorkspaceProject(renamed)
      setProjects((current) => current.map((project) => project.id === renamed.id ? renamed : project))
      setStorageError(null)
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Não foi possível renomear o projeto.')
    }
  }, [activeProjectId])

  const deleteProject = useCallback(async () => {
    if (!activeProjectId) return
    const remaining = projectsRef.current.filter((project) => project.id !== activeProjectId)
    try {
      await deleteWorkspaceProject(activeProjectId)
      if (remaining.length === 0) {
        const replacement = createEmptyProject('Meu projeto', [])
        await saveWorkspaceProject(replacement)
        remaining.push(replacement)
      }
      setProjects(remaining)
      const next = remaining[0]
      setActiveProjectId(next.id)
      localStorage.setItem(ACTIVE_PROJECT_KEY, next.id)
      onRestoreRef.current(next)
      setStorageError(null)
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Não foi possível excluir o projeto.')
    }
  }, [activeProjectId])

  const importProject = useCallback(async (incoming: WorkspaceProject) => {
    await persistCurrent()
    const now = Date.now()
    const id = projectsRef.current.some((project) => project.id === incoming.id) ? crypto.randomUUID() : incoming.id
    const imported = normalizeProject({ ...incoming, id, createdAt: incoming.createdAt || now, updatedAt: now })
    try {
      await saveWorkspaceProject(imported)
      setProjects((current) => [...current, imported])
      setActiveProjectId(imported.id)
      localStorage.setItem(ACTIVE_PROJECT_KEY, imported.id)
      onRestoreRef.current(imported)
      setStorageError(null)
      return true
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Não foi possível importar o projeto.')
      return false
    }
  }, [persistCurrent])

  const getCurrentProject = useCallback(async () => {
    const saved = await persistCurrent()
    return saved ?? activeProject
  }, [activeProject, persistCurrent])

  const addCompletedLesson = useCallback((lessonId: string) => {
    const project = projectsRef.current.find((item) => item.id === activeProjectId)
    if (!project || project.completedLessons.includes(lessonId)) return
    const updated = { ...project, completedLessons: [...project.completedLessons, lessonId], updatedAt: Date.now() }
    setProjects((current) => current.map((item) => item.id === updated.id ? updated : item))
    void saveWorkspaceProject(updated)
  }, [activeProjectId])

  return {
    projects,
    activeProject,
    activeProjectId,
    isReady,
    storageError,
    selectProject,
    createProject,
    duplicateProject,
    renameProject,
    deleteProject,
    importProject,
    getCurrentProject,
    addCompletedLesson,
  }
}
