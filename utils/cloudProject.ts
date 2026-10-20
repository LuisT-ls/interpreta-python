import type { WorkspaceProject } from '@/utils/workspaceDb'

export interface CloudWorkspaceProject extends Omit<WorkspaceProject, 'backupFiles'> {
  backupFiles: Array<Omit<WorkspaceProject['backupFiles'][number], 'data'> & { data: number[] }>
}

export function serializeWorkspaceProject(project: WorkspaceProject): CloudWorkspaceProject {
  return {
    ...project,
    backupFiles: project.backupFiles.map((file) => ({ ...file, data: Array.from(file.data) })),
  }
}

export function deserializeWorkspaceProject(
  input: unknown,
  serverUpdatedAt?: string,
): WorkspaceProject | null {
  if (!input || typeof input !== 'object') return null
  const project = input as Record<string, unknown>
  if (
    typeof project.id !== 'string' ||
    typeof project.name !== 'string' ||
    !Array.isArray(project.tabs) ||
    !Array.isArray(project.cells) ||
    !Array.isArray(project.backupFiles) ||
    typeof project.activeTabId !== 'string' ||
    (project.mode !== 'script' && project.mode !== 'notebook') ||
    !project.settings || typeof project.settings !== 'object' ||
    !Array.isArray(project.history) ||
    !Array.isArray(project.completedLessons) ||
    !Array.isArray(project.packages)
  ) return null

  const backupFiles = project.backupFiles.map((file) => {
    const rawData = file?.data
    const data = Array.isArray(rawData)
      ? Uint8Array.from(rawData.filter((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255))
      : new Uint8Array()
    return { ...file, data }
  })

  return {
    id: project.id,
    name: project.name,
    createdAt: Number(project.createdAt) || Date.now(),
    tabs: project.tabs as WorkspaceProject['tabs'],
    activeTabId: project.activeTabId,
    mode: project.mode,
    settings: project.settings as WorkspaceProject['settings'],
    cells: project.cells as WorkspaceProject['cells'],
    history: project.history as WorkspaceProject['history'],
    completedLessons: project.completedLessons as WorkspaceProject['completedLessons'],
    packages: project.packages as WorkspaceProject['packages'],
    backupFiles,
    lastBackupAt: typeof project.lastBackupAt === 'number' ? project.lastBackupAt : null,
    updatedAt: serverUpdatedAt ? Date.parse(serverUpdatedAt) : Number(project.updatedAt) || Date.now(),
  }
}
