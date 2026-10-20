import JSZip from 'jszip'
import type { WorkspaceProject, VirtualWorkspaceFile } from '@/utils/workspaceDb'
import { normalizeWorkspacePath } from '@/utils/virtualWorkspaceFs'

const ARCHIVE_VERSION = 1
const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024
const MAX_ARCHIVE_FILES = 2_000

export async function createProjectArchive(project: WorkspaceProject): Promise<Blob> {
  const zip = new JSZip()
  const { backupFiles, ...metadata } = project
  zip.file('project.json', JSON.stringify({ formatVersion: ARCHIVE_VERSION, project: metadata }, null, 2))
  backupFiles.forEach((file) => {
    const path = normalizeWorkspacePath(file.path).slice(1)
    if (file.isDirectory) zip.folder(`workspace/${path}`)
    else zip.file(`workspace/${path}`, file.data)
  })
  const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  if (archive.size > MAX_ARCHIVE_BYTES) throw new Error('O projeto excede o limite de exportação de 25 MB. Remova versões antigas do histórico ou exporte arquivos grandes separadamente.')
  return archive
}

export async function readProjectArchive(file: File): Promise<WorkspaceProject> {
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error('O arquivo do projeto ultrapassa o limite de 25 MB.')
  const zip = await JSZip.loadAsync(file)
  const metadataEntry = zip.file('project.json')
  if (!metadataEntry) throw new Error('Este ZIP não contém um projeto Interpretador Python válido.')

  let parsed: { formatVersion?: number; project?: Partial<WorkspaceProject> }
  try {
    parsed = JSON.parse(await metadataEntry.async('string'))
  } catch {
    throw new Error('O arquivo de projeto está corrompido.')
  }
  if (parsed.formatVersion !== ARCHIVE_VERSION || !parsed.project || !Array.isArray(parsed.project.tabs)) {
    throw new Error('A versão ou estrutura deste projeto não é compatível.')
  }

  const archiveEntries = Object.values(zip.files).filter((entry) => entry.name.startsWith('workspace/'))
  if (archiveEntries.length > MAX_ARCHIVE_FILES) throw new Error('O projeto contém mais de 2.000 arquivos e diretórios.')
  const backupFiles: VirtualWorkspaceFile[] = []
  let totalBytes = 0
  for (const entry of archiveEntries) {
    const relativePath = entry.name.slice('workspace/'.length)
    if (!relativePath.replace(/\/+$/, '')) continue
    const path = normalizeWorkspacePath(`/${relativePath}`)
    if (entry.dir) {
      backupFiles.push({ path, data: new Uint8Array(), isDirectory: true })
      continue
    }
    const data = await entry.async('uint8array')
    totalBytes += data.byteLength
    if (totalBytes > MAX_ARCHIVE_BYTES) throw new Error('O conteúdo descompactado ultrapassa o limite de 25 MB.')
    backupFiles.push({ path, data })
  }

  const project = parsed.project as WorkspaceProject
  return {
    ...project,
    id: typeof project.id === 'string' ? project.id : crypto.randomUUID(),
    name: typeof project.name === 'string' ? project.name : 'Projeto importado',
    createdAt: typeof project.createdAt === 'number' ? project.createdAt : Date.now(),
    updatedAt: Date.now(),
    mode: project.mode === 'notebook' ? 'notebook' : 'script',
    cells: Array.isArray(project.cells) ? project.cells : [],
    history: Array.isArray(project.history) ? project.history : [],
    completedLessons: Array.isArray(project.completedLessons) ? project.completedLessons : [],
    packages: Array.isArray(project.packages) ? project.packages : [],
    backupFiles,
    lastBackupAt: typeof project.lastBackupAt === 'number' ? project.lastBackupAt : null,
  }
}
