import type { EditorTab, MatplotlibPlot } from '@/hooks/useEditorTabs'
import type { LayoutType } from '@/hooks/useLayout'

export interface NotebookCell {
  id: string
  code: string
  output: string
  hasError: boolean
  plots: MatplotlibPlot[]
}

export interface ExecutionRun {
  id: string
  tabId: string
  tabName: string
  code: string
  output: string
  hasError: boolean
  plots: MatplotlibPlot[]
  createdAt: number
}

export interface VirtualWorkspaceFile {
  path: string
  data: Uint8Array
  isDirectory?: boolean
}

export interface WorkspaceProject {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  tabs: EditorTab[]
  activeTabId: string
  mode: 'script' | 'notebook'
  settings: { layout: LayoutType; fontSize: number }
  cells: NotebookCell[]
  history: ExecutionRun[]
  completedLessons: string[]
  packages: string[]
  backupFiles: VirtualWorkspaceFile[]
  lastBackupAt: number | null
}

const DATABASE_NAME = 'interpreta-python-workspaces'
const DATABASE_VERSION = 1
const PROJECTS_STORE = 'projects'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB não está disponível neste navegador.'))
      return
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(PROJECTS_STORE)) {
        database.createObjectStore(PROJECTS_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir o workspace.'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROJECTS_STORE, mode)
    const request = action(transaction.objectStore(PROJECTS_STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Falha ao acessar o workspace.'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Falha ao salvar o workspace.'))
    }
  })
}

export const listWorkspaceProjects = () => withStore<WorkspaceProject[]>('readonly', (store) => store.getAll())
export const getWorkspaceProject = (id: string) => withStore<WorkspaceProject | undefined>('readonly', (store) => store.get(id))
export const saveWorkspaceProject = (project: WorkspaceProject) => withStore<IDBValidKey>('readwrite', (store) => store.put(project))
export const deleteWorkspaceProject = (id: string) => withStore<undefined>('readwrite', (store) => store.delete(id))
