'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { logger } from '@/utils/logger'
import JSZip from 'jszip'
import { Panel, Group, Separator } from 'react-resizable-panels'
import { usePyodide } from '@/hooks/usePyodide'
import { useLayout } from '@/hooks/useLayout'
import { useEditorTabs } from '@/hooks/useEditorTabs'
import { useZenMode } from '@/hooks/useZenMode'
import { useSyntaxValidation } from '@/hooks/useSyntaxValidation'
import { PythonEditor } from '@/components/PythonEditor'
import { OutputTerminal } from '@/components/OutputTerminal'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AboutModal } from '@/components/AboutModal'
import { LayoutSelector } from '@/components/LayoutSelector'
import { EditorTabs } from '@/components/EditorTabs'
import { ExportMenu } from '@/components/ExportMenu'
import { CommandPalette, Command } from '@/components/CommandPalette'
import { generateShareUrl, getCodeFromUrl } from '@/utils/shareCode'
import { usePythonExecution } from '@/hooks/usePythonExecution'
import { FileSystemSidebar } from '@/components/FileSystemSidebar'
import { FileEditor } from '@/components/FileEditor'
import { PackageManager } from '@/components/PackageManager'
import { LoadingScreen, EditorSkeleton, TerminalSkeleton } from '@/components/LoadingScreen'
import { ActionToolbar } from '@/components/ActionToolbar'
import { OnboardingModal } from '@/components/OnboardingModal'
import { PersistenceNotice } from '@/components/PersistenceNotice'
import { WorkspaceHub } from '@/components/WorkspaceHub'
import { NotebookEditor } from '@/components/NotebookEditor'
import { LearningPathModal, LEARNING_LESSONS, type LearningLesson } from '@/components/LearningPathModal'
import { ExecutionHistoryModal } from '@/components/ExecutionHistoryModal'
import { ResetWorkspaceDialog } from '@/components/ResetWorkspaceDialog'
import { ResetEnvironmentDialog } from '@/components/ResetEnvironmentDialog'
import { CloudSyncDialog } from '@/components/CloudSyncDialog'
import { OfflineSupport } from '@/components/OfflineSupport'
import { ToastViewport } from '@/components/ToastViewport'
import { useProjectWorkspace } from '@/hooks/useProjectWorkspace'
import { useToast } from '@/hooks/useToast'
import { createProjectArchive, readProjectArchive } from '@/utils/projectArchive'
import { restoreVirtualWorkspace, snapshotVirtualWorkspace } from '@/utils/virtualWorkspaceFs'
import type { ExecutionRun, NotebookCell, VirtualWorkspaceFile, WorkspaceProject } from '@/utils/workspaceDb'
import { saveWorkspaceProject } from '@/utils/workspaceDb'

const ONBOARDING_STORAGE_KEY = 'python-web-ide-onboarding-completed'

export default function Home() {
  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    createNewTab,
    closeTab,
    updateTabCode,
    updateTabOutput,
    addTabPlot,
    clearTabPlots,
    replaceTabs,
  } = useEditorTabs()
  const { layout, changeLayout, isMounted } = useLayout()
  const [fontSize, setFontSize] = useState(14)
  const [isCompactScreen, setIsCompactScreen] = useState(false)
  const [isTabletScreen, setIsTabletScreen] = useState(false)
  const [mobileWorkspaceView, setMobileWorkspaceView] = useState<'editor' | 'terminal'>('editor')
  const mobileWorkbenchRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
    const updateScreenSize = () => {
      setIsCompactScreen(mobileQuery.matches)
      setIsTabletScreen(tabletQuery.matches)
    }
    updateScreenSize()
    mobileQuery.addEventListener('change', updateScreenSize)
    tabletQuery.addEventListener('change', updateScreenSize)
    return () => {
      mobileQuery.removeEventListener('change', updateScreenSize)
      tabletQuery.removeEventListener('change', updateScreenSize)
    }
  }, [])

  useEffect(() => {
    if (isCompactScreen && mobileWorkspaceView === 'terminal') {
      mobileWorkbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isCompactScreen, mobileWorkspaceView])

  const [workspaceMode, setWorkspaceMode] = useState<'script' | 'notebook'>('script')
  const [notebookCells, setNotebookCells] = useState<NotebookCell[]>([])
  const [executionHistory, setExecutionHistory] = useState<ExecutionRun[]>([])
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [workspacePackages, setWorkspacePackages] = useState<string[]>([])
  const [backupFiles, setBackupFiles] = useState<VirtualWorkspaceFile[]>([])
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null)
  const [isLearningPathOpen, setIsLearningPathOpen] = useState(false)
  const [isExecutionHistoryOpen, setIsExecutionHistoryOpen] = useState(false)
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null)
  const activeCellIdRef = useRef<string | null>(null)
  const workspaceModeRef = useRef(workspaceMode)
  const pendingRestoreIdRef = useRef<string | null>(null)
  const restoredProjectIdRef = useRef<string | null>(null)
  const backupRunningRef = useRef(false)

  useEffect(() => { workspaceModeRef.current = workspaceMode }, [workspaceMode])

  const restoreProject = useCallback((project: import('@/utils/workspaceDb').WorkspaceProject) => {
    replaceTabs(project.tabs, project.activeTabId)
    setWorkspaceMode(project.mode)
    changeLayout(project.settings.layout)
    setFontSize(project.settings.fontSize)
    setNotebookCells(project.cells)
    setExecutionHistory(project.history)
    setCompletedLessons(project.completedLessons)
    setWorkspacePackages(project.packages)
    setBackupFiles(project.backupFiles)
    setLastBackupAt(project.lastBackupAt)
    setActiveLessonId(null)
    activeCellIdRef.current = project.cells[0]?.id ?? null
    pendingRestoreIdRef.current = project.id
    restoredProjectIdRef.current = null
  }, [replaceTabs, changeLayout])

  const workspaceDraft = useMemo(() => ({
    tabs,
    activeTabId,
    mode: workspaceMode,
    settings: { layout, fontSize },
    cells: notebookCells,
    history: executionHistory,
    completedLessons,
    packages: workspacePackages,
    backupFiles,
    lastBackupAt,
  }), [tabs, activeTabId, workspaceMode, layout, fontSize, notebookCells, executionHistory, completedLessons, workspacePackages, backupFiles, lastBackupAt])
  const projectWorkspace = useProjectWorkspace({ workspace: workspaceDraft, onRestore: restoreProject })

  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false)
  const [isResetEnvironmentDialogOpen, setIsResetEnvironmentDialogOpen] = useState(false)
  const [isResettingEnvironment, setIsResettingEnvironment] = useState(false)
  const { toast, notify, dismiss: dismissToast } = useToast()

  const { pyodide, loading, error, progress, stage, retry } = usePyodide()
  const { isZenMode, toggleZenMode, isMounted: isZenMounted } = useZenMode()
  const [backupError, setBackupError] = useState<string | null>(null)

  useEffect(() => {
    const projectId = pendingRestoreIdRef.current
    if (!pyodide || loading || !projectWorkspace.isReady || !projectId || restoredProjectIdRef.current === projectId) return
    try {
      restoreVirtualWorkspace(pyodide, backupFiles)
      restoredProjectIdRef.current = projectId
      setBackupError(null)
      if (isResettingEnvironment) {
        setWorkspacePackages([])
        setIsResettingEnvironment(false)
        setIsResetEnvironmentDialogOpen(false)
        setFileSystemRevision((revision) => revision + 1)
        notify('Ambiente reiniciado. Código, histórico e arquivos do projeto foram preservados.')
      }
    } catch (restoreError) {
      setBackupError(restoreError instanceof Error ? restoreError.message : 'Não foi possível restaurar os arquivos do projeto.')
    }
  }, [pyodide, loading, projectWorkspace.isReady, projectWorkspace.activeProjectId, backupFiles, isResettingEnvironment, notify])

  useEffect(() => {
    if (!error || !isResettingEnvironment) return
    setIsResettingEnvironment(false)
    setIsResetEnvironmentDialogOpen(false)
    notify(`O runtime não reiniciou: ${error}`, 'error')
  }, [error, isResettingEnvironment, notify])

  const createWorkspaceBackup = useCallback(async () => {
    if (!pyodide || loading || !projectWorkspace.isReady || !projectWorkspace.activeProject || backupRunningRef.current) return null
    backupRunningRef.current = true
    try {
      const files = snapshotVirtualWorkspace(pyodide)
      const timestamp = Date.now()
      setBackupFiles(files)
      setLastBackupAt(timestamp)
      const latestProject = {
        ...projectWorkspace.activeProject,
        ...workspaceDraft,
        backupFiles: files,
        lastBackupAt: timestamp,
        updatedAt: timestamp,
      }
      await saveWorkspaceProject(latestProject)
      setBackupError(null)
      return files
    } catch (backupFailure) {
      setBackupError(backupFailure instanceof Error ? backupFailure.message : 'Não foi possível criar o backup automático.')
      return null
    } finally {
      backupRunningRef.current = false
    }
  }, [pyodide, loading, projectWorkspace.isReady, projectWorkspace.activeProject, workspaceDraft])

  const getCurrentProjectForCloud = useCallback(async (): Promise<WorkspaceProject | null> => {
    const current = await projectWorkspace.getCurrentProject()
    if (!current) return null
    if (!pyodide || loading) return current

    const files = await createWorkspaceBackup()
    if (!files) return null
    const timestamp = Date.now()
    return {
      ...current,
      ...workspaceDraft,
      backupFiles: files,
      lastBackupAt: timestamp,
      updatedAt: timestamp,
    }
  }, [projectWorkspace.getCurrentProject, pyodide, loading, createWorkspaceBackup, workspaceDraft])

  const deleteWorkspaceBackup = useCallback(async () => {
    if (!projectWorkspace.activeProject) return
    const updated = {
      ...projectWorkspace.activeProject,
      ...workspaceDraft,
      backupFiles: [],
      lastBackupAt: null,
      updatedAt: Date.now(),
    }
    setBackupFiles([])
    setLastBackupAt(null)
    try {
      await saveWorkspaceProject(updated)
      setBackupError(null)
    } catch (deleteError) {
      setBackupError(deleteError instanceof Error ? deleteError.message : 'Não foi possível remover o backup salvo.')
    }
  }, [projectWorkspace.activeProject, workspaceDraft])

  useEffect(() => {
    if (!pyodide || loading || !projectWorkspace.isReady) return
    const interval = window.setInterval(() => { void createWorkspaceBackup() }, 30_000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void createWorkspaceBackup()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pyodide, loading, projectWorkspace.isReady, createWorkspaceBackup])

  // Estado para controlar se deve mostrar o loading screen
  // Só mostra em hard reload (Shift + Reload) ou primeira carga
  const [showLoadingScreen, setShowLoadingScreen] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)

  // Ajustar o estado após a hidratação no cliente
  useEffect(() => {
    setIsClient(true)
    
    // Verificar se Pyodide já está carregado
    // Em reload normal (F5), o script pode já estar em cache
    const scriptExists = document.querySelector('script[src*="pyodide"]')
    const pyodideLoaded = sessionStorage.getItem('pyodide-loaded')
    const windowHasPyodide = typeof window.loadPyodide !== 'undefined'
    
    // Hard reload (Shift + F5) limpa o cache, então:
    // - scriptExists será false (script não está no DOM)
    // - windowHasPyodide será false (função não está disponível)
    // - pyodideLoaded pode ser true ou false (depende se sessionStorage foi limpo)
    
    // Se Pyodide já está disponível (reload normal), não mostrar loading
    // Só mostrar se for primeira carga ou hard reload
    // Hard reload: script não existe E window.loadPyodide não existe
    const isHardReload = !scriptExists && !windowHasPyodide
    
    // Mostrar loading se:
    // 1. É hard reload (não há script nem função disponível)
    // 2. É primeira carga (não há flag no sessionStorage)
    const shouldShow = isHardReload || !pyodideLoaded
    
    setShowLoadingScreen(shouldShow)
  }, [])

  // Quando Pyodide carregar, marcar como carregado na sessão
  useEffect(() => {
    if (!loading && pyodide) {
      sessionStorage.setItem('pyodide-loaded', 'true')
      setShowLoadingScreen(false)
    }
  }, [loading, pyodide])

  // Mantemos erros de runtime separados da validação de sintaxe. Assim, a
  // validação automática que acontece após uma execução não apaga o destaque
  // de um erro real ocorrido durante o runtime.
  const [runtimeErrorLine, setRuntimeErrorLine] = useState<number | null>(null)
  const setExecutionErrorLine = useCallback((line: number | null) => {
    setRuntimeErrorLine(line)
  }, [])

  const activeNotebookCell = notebookCells.find((cell) => cell.id === activeCellIdRef.current) ?? notebookCells[0]
  const updateExecutionOutput = useCallback((tabId: string, output: string, hasError: boolean) => {
    if (workspaceModeRef.current === 'notebook') {
      const cellId = activeCellIdRef.current
      if (cellId) {
        setNotebookCells((current) => current.map((cell) => cell.id === cellId ? { ...cell, output, hasError } : cell))
      }
      return
    }
    updateTabOutput(tabId, output, hasError)
  }, [updateTabOutput])

  const addExecutionPlot = useCallback((tabId: string, plot: { id: string; imageData: string; width: number; height: number; timestamp: number }) => {
    if (workspaceModeRef.current === 'notebook' && activeCellIdRef.current) {
      const cellId = activeCellIdRef.current
      setNotebookCells((current) => current.map((cell) => cell.id === cellId ? { ...cell, plots: [...cell.plots, plot] } : cell))
      return
    }
    addTabPlot(tabId, plot)
  }, [addTabPlot])

  const clearExecutionPlots = useCallback((tabId: string) => {
    if (workspaceModeRef.current === 'notebook' && activeCellIdRef.current) {
      const cellId = activeCellIdRef.current
      setNotebookCells((current) => current.map((cell) => cell.id === cellId ? { ...cell, plots: [] } : cell))
      return
    }
    clearTabPlots(tabId)
  }, [clearTabPlots])

  const recordExecution = useCallback((run: { code: string; fileName: string; output: string; hasError: boolean; plots: Array<{ id: string; imageData: string; width: number; height: number; timestamp: number }> }) => {
    const entry: ExecutionRun = {
      ...run,
      id: crypto.randomUUID(),
      tabId: activeTabId,
      tabName: run.fileName || activeTab.name,
      createdAt: Date.now(),
    }
    setExecutionHistory((current) => [entry, ...current].slice(0, 30))
    const lesson = LEARNING_LESSONS.find((item) => item.id === activeLessonId)
    if (lesson && !run.hasError && run.output.trim() === lesson.expectedOutput.trim()) {
      projectWorkspace.addCompletedLesson(lesson.id)
      setCompletedLessons((current) => current.includes(lesson.id) ? current : [...current, lesson.id])
    }
  }, [activeTabId, activeTab.name, activeLessonId, projectWorkspace.addCompletedLesson])

  // Execução de código Python
  const {
    executeCode,
    stopExecution,
    isExecuting,
    isWaitingInput,
    inputPrompt,
    onInputSubmit,
  } = usePythonExecution({
    pyodide,
    loading,
    code: activeTab.code,
    fileName: activeTab.name,
    activeTabId,
    currentOutput: workspaceMode === 'notebook' ? (activeNotebookCell?.output ?? '') : activeTab.output,
    updateTabOutput: updateExecutionOutput,
    setErrorLine: setExecutionErrorLine,
    addTabPlot: addExecutionPlot,
    clearTabPlots: clearExecutionPlots,
    preserveGlobals: workspaceMode === 'notebook',
    namespaceId: projectWorkspace.activeProjectId || activeTabId,
    onRunComplete: recordExecution,
  })

  // Validação em tempo real de sintaxe
  const { errorLine: syntaxErrorLine, setErrorLine: setSyntaxErrorLine } = useSyntaxValidation({
    pyodide,
    loading,
    isExecuting,
    code: activeTab.code,
    fileName: activeTab.name,
    debounceMs: 800,
  })

  const errorLine = runtimeErrorLine ?? syntaxErrorLine
  const clearErrorLine = useCallback(() => {
    setRuntimeErrorLine(null)
    setSyntaxErrorLine(null)
  }, [setSyntaxErrorLine])

  // Referência para o input de arquivo (oculto)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado para Command Palette
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [errorFocusRequest, setErrorFocusRequest] = useState(0)

  // Estado para Sistema de Arquivos
  const [isFileSystemOpen, setIsFileSystemOpen] = useState(false)
  const [fileSystemRevision, setFileSystemRevision] = useState(0)
  const [editingFilePath, setEditingFilePath] = useState<string | null>(null)

  // Estado para Gerenciador de Pacotes
  const [isPackageManagerOpen, setIsPackageManagerOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isResettingWorkspace, setIsResettingWorkspace] = useState(false)

  const closeOnboarding = useCallback(() => {
    setIsOnboardingOpen(false)
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
  }, [])

  const selectOnboardingExample = useCallback((exampleCode: string) => {
    updateTabCode(activeTabId, exampleCode)
    closeOnboarding()
  }, [activeTabId, closeOnboarding, updateTabCode])

  const focusErrorLine = useCallback(() => {
    setErrorFocusRequest((current) => current + 1)
  }, [])

  const requestEnvironmentReset = useCallback(() => {
    if (!pyodide || loading || isExecuting || !projectWorkspace.isReady || isResettingWorkspace) {
      notify('Aguarde o ambiente Python ficar pronto antes de reiniciá-lo.', 'error')
      return
    }
    setIsResetEnvironmentDialogOpen(true)
  }, [pyodide, loading, isExecuting, projectWorkspace.isReady, isResettingWorkspace, notify])

  const resetPythonEnvironment = useCallback(async () => {
    if (!pyodide || loading || isExecuting || isResettingEnvironment) return
    if (backupRunningRef.current) {
      notify('Aguarde o backup automático terminar antes de reiniciar o ambiente.', 'error')
      return
    }

    setIsResettingEnvironment(true)
    try {
      const files = await createWorkspaceBackup()
      if (!files) throw new Error('Não foi possível criar um backup dos arquivos do projeto.')
      pendingRestoreIdRef.current = projectWorkspace.activeProjectId
      restoredProjectIdRef.current = null
      clearErrorLine()
      setIsPackageManagerOpen(false)
      setIsResetEnvironmentDialogOpen(false)
      retry()
    } catch (resetError) {
      setIsResettingEnvironment(false)
      notify(resetError instanceof Error ? resetError.message : 'Não foi possível reiniciar o ambiente Python.', 'error')
    }
  }, [pyodide, loading, isExecuting, isResettingEnvironment, createWorkspaceBackup, projectWorkspace.activeProjectId, clearErrorLine, retry, notify])

  // O onboarding não interrompe links de código compartilhado.
  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true') return
    if (getCodeFromUrl()) return
    setIsOnboardingOpen(true)
  }, [])

  // Função para exportar apenas a aba atual como arquivo .py
  const exportCurrentTab = useCallback(() => {
    const blob = new Blob([activeTab.code], { type: 'text/x-python' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = activeTab.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [activeTab])

  // Função para exportar todas as abas como arquivo .zip
  const exportAllTabs = useCallback(async () => {
    const zip = new JSZip()

    // Adicionar cada aba como um arquivo .py no ZIP
    tabs.forEach((tab) => {
      zip.file(tab.name, tab.code)
    })

    // Gerar o arquivo ZIP
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'editores.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [tabs])

  const exportProject = useCallback(async () => {
    try {
      const project = await projectWorkspace.getCurrentProject()
      if (!project) return
      const latestFiles = await createWorkspaceBackup()
      if (pyodide && !loading && !latestFiles) {
        throw new Error(backupError ?? 'Não foi possível incluir um backup recente dos arquivos. Tente novamente em instantes.')
      }
      const completeProject = latestFiles
        ? { ...project, backupFiles: latestFiles, lastBackupAt: Date.now() }
        : project
      const blob = await createProjectArchive(completeProject)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${project.name.trim().replace(/[^\w.-]+/g, '-') || 'projeto'}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (exportError) {
      notify(exportError instanceof Error ? exportError.message : 'Não foi possível exportar o projeto.', 'error')
    }
  }, [projectWorkspace.getCurrentProject, createWorkspaceBackup, pyodide, loading, backupError, notify])

  const importProject = useCallback(async (file: File) => {
    try {
      const imported = await readProjectArchive(file)
      const importedSuccessfully = await projectWorkspace.importProject(imported)
      if (!importedSuccessfully) throw new Error('O navegador não conseguiu salvar o projeto importado.')
      notify('Projeto importado com sucesso.')
    } catch (importError) {
      notify(importError instanceof Error ? importError.message : 'Não foi possível importar o projeto.', 'error')
    }
  }, [projectWorkspace.importProject, notify])

  const changeWorkspaceMode = useCallback((mode: 'script' | 'notebook') => {
    setActiveLessonId(null)
    if (mode === 'notebook' && notebookCells.length === 0) {
      const cell = { id: crypto.randomUUID(), code: activeTab.code, output: '', hasError: false, plots: [] }
      setNotebookCells([cell])
      activeCellIdRef.current = cell.id
    }
    if (mode === 'script' && workspaceMode === 'notebook') {
      updateTabCode(activeTabId, notebookCells.map((cell) => cell.code).join('\n\n'))
    }
    setWorkspaceMode(mode)
  }, [workspaceMode, notebookCells, activeTab.code, activeTabId, updateTabCode])

  const runNotebookCell = useCallback((cellId: string, code: string) => {
    activeCellIdRef.current = cellId
    if (isCompactScreen) setMobileWorkspaceView('terminal')
    void executeCode(code)
  }, [executeCode, isCompactScreen])

  const selectNotebookCell = useCallback((cellId: string) => {
    activeCellIdRef.current = cellId
  }, [])

  const runActiveEditor = useCallback(() => {
    if (isCompactScreen) setMobileWorkspaceView('terminal')
    if (workspaceMode === 'notebook') {
      const cell = notebookCells.find((item) => item.id === activeCellIdRef.current) ?? notebookCells[0]
      if (cell) runNotebookCell(cell.id, cell.code)
      return
    }
    void executeCode()
  }, [isCompactScreen, workspaceMode, notebookCells, runNotebookCell, executeCode])

  const openLearningLesson = useCallback((lesson: LearningLesson) => {
    setWorkspaceMode('script')
    setActiveLessonId(lesson.id)
    updateTabCode(activeTabId, lesson.starterCode)
    setIsLearningPathOpen(false)
  }, [activeTabId, updateTabCode])

  const restoreExecutionCode = useCallback((run: ExecutionRun) => {
    const targetTab = tabs.find((tab) => tab.id === run.tabId)
    if (targetTab) {
      setActiveTabId(targetTab.id)
      updateTabCode(targetTab.id, run.code)
    } else {
      updateTabCode(activeTabId, run.code)
    }
    setWorkspaceMode('script')
    setActiveLessonId(null)
    setIsExecutionHistoryOpen(false)
  }, [tabs, activeTabId, setActiveTabId, updateTabCode])

  const handlePackagesChanged = useCallback((packages: string[]) => {
    setWorkspacePackages(packages)
  }, [])

  // Função para importar código de um arquivo .py
  const importCode = () => {
    fileInputRef.current?.click()
  }

  // Handler para quando um arquivo é selecionado
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Verificar se é um arquivo .py
    if (!file.name.endsWith('.py')) {
      notify('Selecione um arquivo .py.', 'error')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        updateTabCode(activeTabId, content)
        notify(`Arquivo ${file.name} carregado.`)
      }
    }
    reader.onerror = () => {
      notify('Não foi possível ler o arquivo selecionado.', 'error')
    }
    reader.readAsText(file)

    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    event.target.value = ''
  }

  useEffect(() => {
    // Carregar tamanho da fonte salvo
    const savedFontSize = localStorage.getItem('python-web-ide-font-size')
    if (savedFontSize) {
      const parsed = parseInt(savedFontSize)
      if (!isNaN(parsed) && parsed >= 10 && parsed <= 24) {
        setFontSize(parsed)
      }
    }
  }, [])

  const handleFontSizeChange = (newSize: number) => {
    setFontSize(newSize)
    localStorage.setItem('python-web-ide-font-size', String(newSize))
  }

  // Função para limpar terminal
  const clearTerminal = useCallback(() => {
    if (workspaceMode === 'notebook' && activeNotebookCell) {
      const cellId = activeNotebookCell.id
      setNotebookCells((current) => current.map((cell) => cell.id === cellId
        ? { ...cell, output: '', hasError: false, plots: [] }
        : cell))
    } else {
      updateTabOutput(activeTabId, '', false)
      clearTabPlots(activeTabId)
    }
    clearErrorLine()
    notify('Saída do terminal limpa.')
  }, [workspaceMode, activeNotebookCell, activeTabId, updateTabOutput, clearTabPlots, clearErrorLine, notify])

  const resetWorkspace = useCallback(async () => {
    if (!pyodide || loading || isExecuting || isResettingWorkspace) return
    if (backupRunningRef.current) {
      notify('Aguarde o backup automático terminar antes de limpar o workspace.', 'error')
      return
    }
    setIsResettingWorkspace(true)

    try {
      restoreVirtualWorkspace(pyodide, [])
      const namespaceId = JSON.stringify(projectWorkspace.activeProjectId || activeTabId)
      pyodide.runPython(`globals().get('__workspace_namespaces', {}).pop(${namespaceId}, None)`)

      const newTabId = crypto.randomUUID()
      const newCellId = crypto.randomUUID()
      const resetTabs = [{
        id: newTabId,
        name: 'editor.py',
        code: '',
        output: '',
        hasError: false,
        plots: [],
      }]
      const resetCells = [{ id: newCellId, code: '', output: '', hasError: false, plots: [] }]
      replaceTabs(resetTabs, newTabId)
      setNotebookCells(resetCells)
      activeCellIdRef.current = newCellId
      setWorkspaceMode('script')
      setExecutionHistory([])
      setCompletedLessons([])
      setActiveLessonId(null)
      setBackupFiles([])
      setLastBackupAt(null)
      setBackupError(null)
      setFileSystemRevision((revision) => revision + 1)
      clearErrorLine()

      const activeProject = projectWorkspace.activeProject
      if (activeProject) {
        try {
          await saveWorkspaceProject({
            ...activeProject,
            tabs: resetTabs,
            activeTabId: newTabId,
            mode: 'script',
            cells: resetCells,
            history: [],
            completedLessons: [],
            backupFiles: [],
            lastBackupAt: null,
            updatedAt: Date.now(),
          })
        } catch (storageFailure) {
          const message = storageFailure instanceof Error ? storageFailure.message : 'falha ao salvar no IndexedDB.'
          setBackupError(message)
          notify(`Workspace limpo nesta sessão, mas não foi possível salvar a alteração: ${message}`, 'error')
          return
        }
      }
      notify('Workspace limpo. O runtime e os pacotes carregados foram mantidos.')
    } catch (resetError) {
      notify(resetError instanceof Error ? `Não foi possível limpar o workspace: ${resetError.message}` : 'Não foi possível limpar o workspace.', 'error')
    } finally {
      setIsResettingWorkspace(false)
      setIsResetDialogOpen(false)
    }
  }, [pyodide, loading, isExecuting, isResettingWorkspace, projectWorkspace.activeProjectId, projectWorkspace.activeProject, activeTabId, replaceTabs, clearErrorLine, notify])

  const requestWorkspaceReset = useCallback(() => {
    if (isExecuting || loading || !pyodide || !projectWorkspace.isReady) {
      notify('Aguarde o editor e o ambiente Python ficarem prontos antes de limpar o workspace.', 'error')
      return
    }
    setIsResetDialogOpen(true)
  }, [isExecuting, loading, pyodide, projectWorkspace.isReady, notify])

  // Função para formatar código (básico - indentação)
  const formatCode = useCallback(() => {
    // Formatação básica: remover espaços extras e normalizar indentação
    const lines = activeTab.code.split('\n')
    const formatted = lines
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // Remover múltiplas linhas vazias

    if (formatted !== activeTab.code) {
      updateTabCode(activeTabId, formatted)
    }
  }, [activeTab.code, activeTabId, updateTabCode])

  // Função para compartilhar código
  const shareCode = useCallback(async () => {
    try {
      const shareUrl = generateShareUrl(activeTab.code)
      
      // Tentar usar Web Share API se disponível
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Código Python',
            text: `Confira este código Python: ${activeTab.name}`,
            url: shareUrl,
          })
          return
        } catch (err) {
          // Se o usuário cancelar, continuar com fallback
          if ((err as Error).name !== 'AbortError') {
            logger.error('Erro ao compartilhar:', err)
          }
        }
      }
      
      // Fallback: copiar para clipboard
      await navigator.clipboard.writeText(shareUrl)
      notify('URL copiada para a área de transferência!')
    } catch (error) {
      logger.error('Erro ao compartilhar código:', error)
      notify('Não foi possível gerar ou copiar a URL de compartilhamento.', 'error')
    }
  }, [activeTab.code, activeTab.name, notify])

  // Detectar código na URL ao carregar
  useEffect(() => {
    const codeFromUrl = getCodeFromUrl()
    if (codeFromUrl && codeFromUrl.trim()) {
      // Atualizar a aba atual com o código compartilhado
      updateTabCode(activeTabId, codeFromUrl)
      // Limpar a URL para não recarregar o código ao recarregar a página
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, []) // Executar apenas uma vez ao montar

  // Função para alternar tema
  const toggleTheme = useCallback(() => {
    const isDark = document.documentElement.classList.contains('dark')
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }, [])

  // Comandos da Command Palette
  const commands: Command[] = [
    {
      id: 'toggle-theme',
      label: 'Alternar Tema',
      description: 'Alternar entre tema claro e escuro',
      keywords: ['tema', 'theme', 'dark', 'light', 'modo escuro'],
      action: toggleTheme,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      id: 'execute',
      label: workspaceMode === 'notebook' ? 'Executar Célula Atual' : 'Executar Código',
      description: workspaceMode === 'notebook' ? 'Executar a célula selecionada no notebook' : 'Executar o código Python atual',
      keywords: ['executar', 'run', 'executar código'],
      action: runActiveEditor,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'format',
      label: 'Formatar Código',
      description: 'Formatar e limpar o código atual',
      keywords: ['formatar', 'format', 'limpar', 'clean'],
      action: formatCode,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      id: 'clear-terminal',
      label: 'Limpar Terminal',
      description: 'Limpar a saída do terminal',
      keywords: ['limpar', 'clear', 'terminal', 'saída'],
      action: clearTerminal,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    {
      id: 'reset-workspace',
      label: 'Limpar workspace do projeto',
      description: 'Apagar código, histórico e arquivos virtuais deste projeto',
      keywords: ['reset', 'limpar workspace', 'apagar projeto'],
      action: requestWorkspaceReset,
    },
    {
      id: 'zen-mode',
      label: isZenMode ? 'Sair do Modo Zen' : 'Modo Zen',
      description: isZenMode ? 'Sair do modo foco' : 'Focar apenas no editor',
      keywords: ['zen', 'foco', 'focus', 'fullscreen', 'tela cheia'],
      action: toggleZenMode,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isZenMode ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          )}
        </svg>
      ),
    },
    {
      id: 'share',
      label: 'Compartilhar Código',
      description: 'Gerar URL para compartilhar o código atual',
      keywords: ['compartilhar', 'share', 'url', 'link', 'compartilhar código'],
      action: shareCode,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      ),
    },
    {
      id: 'cloud-sync',
      label: 'Conta e projetos na nuvem',
      description: 'Entrar, salvar ou baixar uma cópia de projeto na nuvem',
      keywords: ['conta', 'login', 'nuvem', 'cloud', 'sincronizar', 'backup'],
      action: () => setIsCloudSyncOpen(true),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 18a4 4 0 01-.5-7.97A5.5 5.5 0 0117 8a4 4 0 01.5 7.97M12 12v9m0 0l-3-3m3 3l3-3" />
        </svg>
      ),
    },
    {
      id: 'toggle-filesystem',
      label: isFileSystemOpen ? 'Fechar Sistema de Arquivos' : 'Abrir Sistema de Arquivos',
      description: isFileSystemOpen ? 'Fechar a sidebar de arquivos' : 'Abrir a sidebar de arquivos virtuais',
      keywords: ['arquivos', 'files', 'filesystem', 'sistema de arquivos', 'file system'],
      action: () => setIsFileSystemOpen(!isFileSystemOpen),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      id: 'package-manager',
      label: 'Gerenciador de Pacotes',
      description: 'Instalar e gerenciar pacotes Python',
      keywords: ['pacotes', 'packages', 'pip', 'instalar', 'install', 'gerenciador'],
      action: () => setIsPackageManagerOpen(true),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
  ]

  // Atalhos de teclado globais
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        isAboutModalOpen || isPackageManagerOpen || isResetDialogOpen || isResettingWorkspace || isResetEnvironmentDialogOpen || isResettingEnvironment || isCloudSyncOpen || Boolean(editingFilePath) ||
        isLearningPathOpen || isExecutionHistoryOpen || isOnboardingOpen || isCommandPaletteOpen
      ) return

      // Ctrl + P ou Cmd + P: Abrir Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !e.shiftKey) {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
        return
      }

      // Ctrl + Enter ou F8: Executar código
      if (((e.ctrlKey || e.metaKey) && e.key === 'Enter') || e.key === 'F8') {
        e.preventDefault()
        runActiveEditor()
        return
      }

      // F1: Abrir modal Sobre
      if (e.key === 'F1') {
        e.preventDefault()
        setIsAboutModalOpen(true)
        return
      }

      // F9: Atalho alternativo para parar execução (opcional, mas útil)
      if (e.key === 'F9' && isExecuting) {
        e.preventDefault()
        stopExecution()
        return
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [runActiveEditor, isExecuting, stopExecution, isCommandPaletteOpen, isAboutModalOpen, isPackageManagerOpen, isResetDialogOpen, isResettingWorkspace, isResetEnvironmentDialogOpen, isResettingEnvironment, isCloudSyncOpen, editingFilePath, isLearningPathOpen, isExecutionHistoryOpen, isOnboardingOpen])

  const terminalOutput = workspaceMode === 'notebook'
    ? activeNotebookCell?.output ?? ''
    : activeTab.output
  const terminalHasError = workspaceMode === 'notebook'
    ? activeNotebookCell?.hasError ?? false
    : activeTab.hasError
  const terminalPlots = workspaceMode === 'notebook'
    ? activeNotebookCell?.plots ?? []
    : activeTab.plots
  const panelOrientation = isCompactScreen || isTabletScreen || layout === 'bottom' || layout === 'top'
    ? 'vertical'
    : 'horizontal'
  const terminalFirst = panelOrientation === 'horizontal' ? layout === 'left' : layout === 'top'

  const editorContent = loading ? <EditorSkeleton /> : (
    <>
      <EditorTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={setActiveTabId}
        onTabClose={closeTab}
        onNewTab={createNewTab}
        onImport={importCode}
        onExportCurrent={exportCurrentTab}
        onExportAll={exportAllTabs}
        onShare={shareCode}
        fontSize={fontSize}
        onFontSizeChange={handleFontSizeChange}
      />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {workspaceMode === 'notebook' ? (
          <NotebookEditor
            cells={notebookCells}
            onChange={setNotebookCells}
            onRunCell={runNotebookCell}
            onSelectCell={selectNotebookCell}
            isExecuting={isExecuting}
            isDisabled={loading || !pyodide || isResettingWorkspace}
            fontSize={fontSize}
          />
        ) : (
          <PythonEditor
            code={activeTab.code}
            onChange={(newCode) => {
              updateTabCode(activeTabId, newCode)
              clearErrorLine()
            }}
            disabled={loading || isExecuting}
            fileName={activeTab.name}
            errorLine={errorLine}
            errorFocusRequest={errorFocusRequest}
            onRun={runActiveEditor}
            fontSize={fontSize}
          />
        )}
      </div>
    </>
  )

  const terminalContent = loading ? <TerminalSkeleton /> : (
    <OutputTerminal
      output={terminalOutput}
      isError={terminalHasError}
      errorLine={errorLine}
      isLoading={false}
      isWaitingInput={isWaitingInput}
      inputPrompt={inputPrompt}
      onInputSubmit={onInputSubmit}
      onGoToError={focusErrorLine}
      onClear={clearTerminal}
      onNotify={notify}
      plots={terminalPlots}
    />
  )

  const editorPanel = (
    <Panel key="editor" defaultSize={60} minSize={20} className="flex min-h-0 min-w-0 flex-col">
      <section aria-label="Editor de código" className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
        {editorContent}
      </section>
    </Panel>
  )

  const terminalPanel = (
    <Panel key="terminal" defaultSize={40} minSize={20} className="flex min-h-0 min-w-0 flex-col">
      <section aria-label="Terminal de saída" className="h-full min-h-0 min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
        {terminalContent}
      </section>
    </Panel>
  )

  const panelSeparator = (
    <Separator className={`relative z-10 shrink-0 bg-transparent transition-colors hover:bg-blue-400/20 dark:hover:bg-blue-600/20 ${panelOrientation === 'vertical' ? 'cursor-row-resize' : 'cursor-col-resize'} group`}>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className={`${panelOrientation === 'vertical' ? 'h-0.5 w-10' : 'h-10 w-0.5'} rounded-full bg-gray-300 transition-colors group-hover:bg-blue-500 dark:bg-gray-700 dark:group-hover:bg-blue-400`} />
      </div>
    </Separator>
  )

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors ${isZenMode ? 'zen-mode' : ''}`}>
      <OfflineSupport />
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={closeOnboarding}
        onSelectExample={selectOnboardingExample}
      />
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
      <LearningPathModal
        isOpen={isLearningPathOpen}
        isBusy={isExecuting}
        completedLessons={completedLessons}
        onClose={() => setIsLearningPathOpen(false)}
        onOpenLesson={openLearningLesson}
      />
      <ExecutionHistoryModal
        isOpen={isExecutionHistoryOpen}
        isBusy={isExecuting}
        runs={executionHistory}
        onClose={() => setIsExecutionHistoryOpen(false)}
        onRestoreCode={restoreExecutionCode}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />
      <FileEditor
        pyodide={pyodide}
        loading={loading}
        filePath={editingFilePath}
        onClose={() => setEditingFilePath(null)}
      />
      <PackageManager
        pyodide={pyodide}
        loading={loading}
        isOpen={isPackageManagerOpen}
        onClose={() => setIsPackageManagerOpen(false)}
        onPackagesChanged={handlePackagesChanged}
        onResetEnvironment={requestEnvironmentReset}
        isResettingEnvironment={isResettingEnvironment}
      />
      <ResetWorkspaceDialog
        isOpen={isResetDialogOpen}
        isBusy={isResettingWorkspace}
        onCancel={() => { if (!isResettingWorkspace) setIsResetDialogOpen(false) }}
        onConfirm={resetWorkspace}
      />
      <ResetEnvironmentDialog
        isOpen={isResetEnvironmentDialogOpen}
        isBusy={isResettingEnvironment}
        onCancel={() => { if (!isResettingEnvironment) setIsResetEnvironmentDialogOpen(false) }}
        onConfirm={resetPythonEnvironment}
      />
      <CloudSyncDialog
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        currentProject={projectWorkspace.activeProject}
        getCurrentProject={getCurrentProjectForCloud}
        onImportProject={projectWorkspace.importProject}
      />
      <ToastViewport toast={toast} onDismiss={dismissToast} />
      {/* Header */}
      {(!isZenMode || !isZenMounted) && (
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm overflow-visible">
        <div className="mx-auto w-full max-w-7xl overflow-visible px-4 sm:px-6 lg:max-w-[1440px] lg:px-8 2xl:max-w-[1720px] 2xl:px-10">
          <div className="flex items-center justify-between h-16 overflow-visible">
              {/* Logo e Título */}
              <div className="flex min-w-0 items-center">
                <div className="flex min-w-0 flex-col">
                  <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-gray-800 dark:text-gray-100 sm:text-lg">
                    <span>Interpreta</span>{' '}
                    <span className="font-bold text-blue-600 dark:text-blue-400">Python</span>
                  </h1>
                  <span className="text-xs text-gray-500 dark:text-gray-400 hidden lg:inline">
                    Aprenda programando no navegador
                  </span>
            </div>
              </div>

              {/* Controles */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Grupo: Layout e Modo Zen */}
                <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 overflow-visible">
              {isMounted && <LayoutSelector currentLayout={layout} onLayoutChange={changeLayout} />}
                  <div className="w-px h-5 sm:h-6 bg-gray-300 dark:bg-gray-700" />
                  <button
                    onClick={toggleZenMode}
                    className={`relative p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 rounded-md transition-all duration-200 ${
                      isZenMode
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title={isZenMode ? 'Sair do Modo Zen (Foco)' : 'Modo Zen - Focar apenas no editor'}
                    aria-label={isZenMode ? 'Sair do Modo Zen' : 'Modo Zen'}
                  >
                    {isZenMode ? (
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    )}
                    {isZenMode && (
                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </button>
                </div>

                {/* Modo Zen isolado em mobile */}
                <button
                  onClick={toggleZenMode}
                  className={`sm:hidden relative p-2 text-gray-600 dark:text-gray-400 rounded-lg transition-all duration-200 ${
                    isZenMode
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title={isZenMode ? 'Sair do Modo Zen' : 'Modo Zen'}
                  aria-label={isZenMode ? 'Sair do Modo Zen' : 'Modo Zen'}
                >
                  {isZenMode ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>

                {/* Separador */}
                <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-0.5" />

                {/* Grupo: Informações e Tema */}
                <div className="flex items-center gap-0.5 sm:gap-1">
              <button
                onClick={() => setIsAboutModalOpen(true)}
                    className="relative p-2 sm:p-2.5 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200 group"
                    title="Sobre o Interpreta Python (F1)"
                aria-label="Sobre"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden sm:block">
                      F1
                    </span>
              </button>
              <ThemeToggle />
                </div>
            </div>
          </div>
        </div>
      </header>
      )}

      {/* Main Content */}
      <main className={`relative ${isZenMode ? 'max-w-full mx-0 px-0 py-0' : 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:max-w-[1440px] lg:px-8 2xl:max-w-[1720px] 2xl:px-10'}`}>
        {/* Loading Screen Overlay - apenas em hard reload ou primeira carga */}
        {isClient && loading && showLoadingScreen && (
          <LoadingScreen progress={progress} stage={stage} />
        )}

        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 animate-in fade-in">
            <p className="text-red-800 dark:text-red-200 font-medium">
              Erro ao carregar Pyodide: {error}
            </p>
            <p className="text-red-600 dark:text-red-300 text-sm mt-2">
              Verifique sua conexão com a internet e tente carregar o ambiente novamente.
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.5M20 12a8 8 0 00-15.5-3M20 20v-5h-.5M4 12a8 8 0 0015.5 3" />
              </svg>
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className={`space-y-4 transition-smooth ${isZenMode ? 'h-screen flex flex-col' : ''} ${loading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {!isZenMode && (
              <section aria-label="Workspace e ações do editor" className="relative z-20 overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <WorkspaceHub
                  projects={projectWorkspace.projects}
                  activeProjectId={projectWorkspace.activeProjectId}
                  mode={workspaceMode}
                  isReady={projectWorkspace.isReady}
                  isBusy={isExecuting || isResettingWorkspace || isResettingEnvironment || loading || !pyodide || !projectWorkspace.isReady}
                  lastBackupAt={lastBackupAt}
                  packages={workspacePackages}
                  storageError={backupError ?? projectWorkspace.storageError}
                  onSelectProject={projectWorkspace.selectProject}
                  onCreateProject={projectWorkspace.createProject}
                  onDuplicateProject={projectWorkspace.duplicateProject}
                  onRenameProject={projectWorkspace.renameProject}
                  onDeleteProject={projectWorkspace.deleteProject}
                  onExportProject={exportProject}
                  onDeleteBackup={deleteWorkspaceBackup}
                  onImportProject={importProject}
                  onModeChange={changeWorkspaceMode}
                  onOpenLearning={() => setIsLearningPathOpen(true)}
                  onOpenHistory={() => setIsExecutionHistoryOpen(true)}
                  onResetWorkspace={requestWorkspaceReset}
                />
                <ActionToolbar
                  onRun={runActiveEditor}
                  onStop={stopExecution}
                  onNewTab={createNewTab}
                  onImport={importCode}
                  onExport={exportCurrentTab}
                  onShare={shareCode}
                  onOpenCloud={() => setIsCloudSyncOpen(true)}
                  onToggleFiles={() => setIsFileSystemOpen((open) => !open)}
                  onOpenPackages={() => setIsPackageManagerOpen(true)}
                  onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                  isExecuting={isExecuting}
                  isDisabled={loading || !pyodide || isResettingWorkspace}
                  isFileSystemOpen={isFileSystemOpen}
                />
              </section>
            )}

            {!isZenMode && !loading && <PersistenceNotice onExport={exportCurrentTab} />}

            {/* Layout dinâmico baseado na escolha do usuário com painéis redimensionáveis */}
            {isMounted && (
              <div className={isZenMode ? 'flex-1 h-full' : 'w-full'}>
                {isZenMode ? (
                  // Modo Zen: apenas o editor em tela cheia
                  <div className="relative flex h-full min-h-0 flex-col bg-white transition-smooth dark:bg-gray-900">
                    {editorContent}
                    {/* Zen Mode Overlay */}
                    <div className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] right-[max(env(safe-area-inset-right),1rem)] z-50 flex flex-col items-end gap-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur px-2 py-1 rounded shadow-sm">
                        Mais opções (Ctrl + P)
                      </div>
                       <button
                         onClick={toggleZenMode}
                         className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-105"
                       >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                         </svg>
                         <span>Sair do Modo Zen</span>
                       </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    {/* FileSystem Sidebar */}
                    {isFileSystemOpen && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-30 bg-black/40 md:hidden"
                          onClick={() => setIsFileSystemOpen(false)}
                          aria-label="Fechar explorador de arquivos"
                        />
                        <div className="fixed inset-y-0 left-0 z-40 w-64 bg-white pt-16 shadow-xl dark:bg-gray-950 md:relative md:inset-auto md:z-auto md:shrink-0 md:pt-0 md:shadow-none">
                          <FileSystemSidebar
                            key={fileSystemRevision}
                            pyodide={pyodide}
                            loading={loading}
                            isOpen={true}
                            isModalDrawer={isCompactScreen}
                            onToggle={() => setIsFileSystemOpen(false)}
                            onFileSelect={(path) => setEditingFilePath(path)}
                          />
                        </div>
                      </>
                    )}

                    {isCompactScreen && (
                      <section ref={mobileWorkbenchRef} aria-label="Área de trabalho" className="scroll-mt-20 flex h-[68dvh] min-h-[320px] max-h-[760px] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
                        <div role="group" aria-label="Alternar entre editor e terminal" className="grid grid-cols-2 gap-1 border-b border-gray-200 bg-gray-50 p-1.5 dark:border-gray-800 dark:bg-gray-950">
                          <button
                            type="button"
                            id="mobile-editor-tab"
                            aria-pressed={mobileWorkspaceView === 'editor'}
                            aria-controls="mobile-editor-panel"
                            onClick={() => setMobileWorkspaceView('editor')}
                            className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${mobileWorkspaceView === 'editor' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'}`}
                          >
                            Editor <span className="ml-1 inline-block max-w-28 truncate align-bottom text-xs font-normal opacity-80">{activeTab.name}</span>
                          </button>
                          <button
                            type="button"
                            id="mobile-terminal-tab"
                            aria-pressed={mobileWorkspaceView === 'terminal'}
                            aria-controls="mobile-terminal-panel"
                            aria-label={terminalOutput ? 'Terminal, saída disponível' : 'Terminal'}
                            onClick={() => setMobileWorkspaceView('terminal')}
                            className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${mobileWorkspaceView === 'terminal' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'}`}
                          >
                            Terminal{terminalOutput ? <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" aria-hidden="true" /> : null}
                          </button>
                        </div>
                        <div
                          id="mobile-editor-panel"
                          role="tabpanel"
                          aria-labelledby="mobile-editor-tab"
                          className={`${mobileWorkspaceView === 'editor' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}
                        >
                          {editorContent}
                        </div>
                        <div
                          id="mobile-terminal-panel"
                          role="tabpanel"
                          aria-labelledby="mobile-terminal-tab"
                          className={`${mobileWorkspaceView === 'terminal' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 overflow-hidden`}
                        >
                          {terminalContent}
                        </div>
                      </section>
                    )}

                    {/* Layout redimensionável em tablets e desktops */}
                    {!isCompactScreen && (
                    <div className="hidden h-[clamp(380px,calc(100dvh_-_17rem),900px)] min-h-0 w-full gap-0 md:flex">
                    {/* Atalhos laterais ficam ocultos em celulares; as ações também estão na barra superior. */}
                    {!isFileSystemOpen && (
                      <div className="fixed left-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 md:flex">
                        <button
                          onClick={() => setIsFileSystemOpen(true)}
                          className="bg-gray-800 dark:bg-gray-900 text-white p-2 rounded-r-lg shadow-lg hover:bg-gray-700 dark:hover:bg-gray-800 transition-all hover:scale-105 border-l-2 border-transparent hover:border-blue-500"
                          title="Abrir Sistema de Arquivos"
                          aria-label="Abrir Sistema de Arquivos"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setIsPackageManagerOpen(true)}
                          className="bg-gray-800 dark:bg-gray-900 text-white p-2 rounded-r-lg shadow-lg hover:bg-gray-700 dark:hover:bg-gray-800 transition-all hover:scale-105 border-l-2 border-transparent hover:border-blue-500"
                          title="Abrir Gerenciador de Pacotes"
                          aria-label="Abrir Gerenciador de Pacotes"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            {/* Cubo 3D wireframe */}
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 7L2 17" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 12L12 22" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M22 7L22 17" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <Group
                      orientation={panelOrientation}
                      className="min-h-0 min-w-0 flex-1"
                    >
                      {terminalFirst ? terminalPanel : editorPanel}
                      {panelSeparator}
                      {terminalFirst ? editorPanel : terminalPanel}
                    </Group>
                    </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      {!isZenMode && (
      <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:max-w-[1440px] lg:px-8 2xl:max-w-[1720px] 2xl:px-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
            {/* Informações do desenvolvedor */}
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <p>
                © {new Date().getFullYear()} Desenvolvido por{' '}
                <a
                  href="https://luistls.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Luis Teixeira
                </a>
              </p>
              <span className="hidden md:inline">•</span>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/LuisT-ls/interpreta-python"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  title="Ver no GitHub"
                  aria-label="GitHub do projeto"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/in/luis-tei"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Ver no LinkedIn"
                  aria-label="LinkedIn do desenvolvedor"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Powered by */}
            <div className="flex items-center gap-2">
              <span>Powered by</span>
              <a
                href="https://pyodide.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Pyodide
              </a>
              <span>e</span>
              <a
                href="https://nextjs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Next.js
              </a>
            </div>
          </div>
        </div>
      </footer>
      )}

      {/* Input oculto para importar arquivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".py"
        onChange={handleFileImport}
        className="hidden"
        aria-label="Importar arquivo Python"
      />
    </div>
  )
}

