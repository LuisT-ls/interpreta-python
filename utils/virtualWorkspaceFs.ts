import type { VirtualWorkspaceFile } from '@/utils/workspaceDb'

const SYSTEM_ROOT_ENTRIES = new Set([
  'bin', 'dev', 'etc', 'lib', 'lib64', 'media', 'mnt', 'opt', 'proc',
  'root', 'run', 'sbin', 'srv', 'sys', 'tmp', 'usr', 'var',
])
const MAX_BACKUP_BYTES = 20 * 1024 * 1024

interface PyodideFileSystem {
  FS: {
    readdir: (path: string) => string[]
    stat: (path: string) => { mode: number; size: number }
    isDir: (mode: number) => boolean
    readFile: (path: string) => string | Uint8Array
    writeFile: (path: string, data: Uint8Array) => void
    mkdir: (path: string) => void
    unlink: (path: string) => void
    rmdir: (path: string) => void
  }
}

export function snapshotVirtualWorkspace(pyodide: PyodideFileSystem): VirtualWorkspaceFile[] {
  const files: VirtualWorkspaceFile[] = []
  let totalBytes = 0
  const walk = (path: string) => {
    for (const name of pyodide.FS.readdir(path)) {
      if (name === '.' || name === '..') continue
      if (path === '/' && SYSTEM_ROOT_ENTRIES.has(name)) continue
      const childPath = path === '/' ? `/${name}` : `${path}/${name}`
      const stat = pyodide.FS.stat(childPath)
      if (pyodide.FS.isDir(stat.mode)) {
        files.push({ path: childPath, data: new Uint8Array(), isDirectory: true })
        if (files.length > 2_000) throw new Error('O workspace contém mais de 2.000 arquivos e diretórios.')
        walk(childPath)
        continue
      }

      const rawData = pyodide.FS.readFile(childPath)
      const data = typeof rawData === 'string' ? new TextEncoder().encode(rawData) : new Uint8Array(rawData)
      totalBytes += data.byteLength
      if (totalBytes > MAX_BACKUP_BYTES) {
        throw new Error('O workspace excede o limite de backup de 20 MB. Exporte arquivos grandes separadamente.')
      }
      files.push({ path: childPath, data })
    }
  }

  walk('/')
  return files
}

export function restoreVirtualWorkspace(pyodide: PyodideFileSystem, files: VirtualWorkspaceFile[]): void {
  const FS = pyodide.FS
  const removeTree = (path: string) => {
    const stat = FS.stat(path)
    if (FS.isDir(stat.mode)) {
      for (const name of FS.readdir(path)) {
        if (name !== '.' && name !== '..') removeTree(path === '/' ? `/${name}` : `${path}/${name}`)
      }
      FS.rmdir(path)
    } else {
      FS.unlink(path)
    }
  }

  const clearDirectoryContents = (path: string) => {
    for (const name of FS.readdir(path)) {
      if (name === '.' || name === '..') continue
      const childPath = `${path}/${name}`
      const stat = FS.stat(childPath)
      if (FS.isDir(stat.mode)) {
        clearDirectoryContents(childPath)
        FS.rmdir(childPath)
      } else {
        FS.unlink(childPath)
      }
    }
  }

  for (const name of FS.readdir('/')) {
    if (name === '.' || name === '..' || name === 'home' || SYSTEM_ROOT_ENTRIES.has(name)) continue
    removeTree(`/${name}`)
  }

  // Pyodide normally uses /home/pyodide as its current directory. Preserve
  // that directory itself while replacing its user files for this project.
  try {
    for (const name of FS.readdir('/home')) {
      if (name !== '.' && name !== '..' && name !== 'pyodide') removeTree(`/home/${name}`)
    }
    clearDirectoryContents('/home/pyodide')
  } catch {
    // New runtimes may not have created the home directory yet.
  }

  const directories = new Set<string>()
  for (const file of files) {
    const normalized = normalizeWorkspacePath(file.path)
    const parts = normalized.split('/').filter(Boolean)
    let parent = ''
    for (const part of parts.slice(0, -1)) {
      parent += `/${part}`
      directories.add(parent)
    }
    if (file.isDirectory) directories.add(normalized)
  }

  for (const directory of [...directories].sort((a, b) => a.length - b.length)) {
    try { FS.mkdir(directory) } catch { /* Diretório já existe. */ }
  }
  for (const file of files) {
    if (file.isDirectory) continue
    const normalized = normalizeWorkspacePath(file.path)
    FS.writeFile(normalized, file.data)
  }
}

export function normalizeWorkspacePath(path: string): string {
  if (!path.startsWith('/') || path.includes('\\')) throw new Error('Caminho de arquivo inválido no projeto.')
  const parts = path.split('/').filter(Boolean)
  if (parts.some((part) => part === '.' || part === '..')) throw new Error('O projeto contém um caminho inseguro.')
  if (parts.length === 0 || SYSTEM_ROOT_ENTRIES.has(parts[0])) throw new Error('O projeto tenta alterar arquivos internos do Python.')
  return `/${parts.join('/')}`
}
