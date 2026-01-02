'use client'

import { useState, useCallback, useEffect } from 'react'
import { logger } from '@/utils/logger'

export interface FileSystemEntry {
  name: string
  path: string
  isDirectory: boolean
  size?: number
}

interface UseFileSystemOptions {
  pyodide: any
  loading: boolean
}

interface UseFileSystemReturn {
  files: FileSystemEntry[]
  currentPath: string
  isLoading: boolean
  error: string | null
  createFile: (name: string, content: string, path?: string) => boolean
  createDirectory: (name: string, path?: string) => boolean
  deleteEntry: (path: string) => boolean
  readFile: (path: string) => string | null
  writeFile: (path: string, content: string) => boolean
  navigate: (path: string) => void
  navigateUp: () => void
  refresh: () => void
  uploadFile: (file: File, targetPath?: string) => Promise<boolean>
  downloadFile: (path: string) => boolean
  renameEntry: (oldPath: string, newName: string) => boolean
}

/**
 * Hook para gerenciar o sistema de arquivos virtual do Pyodide
 * Permite criar, ler, escrever, deletar e navegar arquivos/diretórios
 */
export function useFileSystem({
  pyodide,
  loading,
}: UseFileSystemOptions): UseFileSystemReturn {
  const [files, setFiles] = useState<FileSystemEntry[]>([])
  const [currentPath, setCurrentPath] = useState('/')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Lista arquivos e diretórios do caminho atual
   */
  const listFiles = useCallback(
    (path: string = currentPath): FileSystemEntry[] => {
      if (!pyodide || loading) return []

      try {
        const FS = pyodide.FS
        if (!FS) return []

        // Normalizar o caminho
        const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '') || '/'

        // Verificar se o diretório existe
        try {
          const stat = FS.stat(normalizedPath)
          if (!FS.isDir(stat.mode)) {
            return []
          }
        } catch {
          return []
        }

        // Listar conteúdo do diretório
        const entries = FS.readdir(normalizedPath)
        const result: FileSystemEntry[] = []

        for (const entry of entries) {
          // Ignorar entradas especiais
          if (entry === '.' || entry === '..') continue

          try {
            const entryPath = normalizedPath === '/' 
              ? `/${entry}` 
              : `${normalizedPath}/${entry}`
            
            const stat = FS.stat(entryPath)
            const isDirectory = FS.isDir(stat.mode)

            result.push({
              name: entry,
              path: entryPath,
              isDirectory,
              size: isDirectory ? undefined : stat.size,
            })
          } catch (e) {
            // Ignorar entradas que não podem ser acessadas
            logger.warn(`Erro ao acessar entrada ${entry}:`, e)
          }
        }

        // Ordenar: diretórios primeiro, depois arquivos, ambos alfabeticamente
        result.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })

        return result
      } catch (err) {
        logger.error('Erro ao listar arquivos:', err)
        setError(err instanceof Error ? err.message : 'Erro ao listar arquivos')
        return []
      }
    },
    [pyodide, loading, currentPath]
  )

  /**
   * Atualiza a lista de arquivos
   */
  const refresh = useCallback(() => {
    if (!pyodide || loading) return

    setIsLoading(true)
    setError(null)

    try {
      const fileList = listFiles(currentPath)
      setFiles(fileList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar lista')
    } finally {
      setIsLoading(false)
    }
  }, [pyodide, loading, currentPath, listFiles])

  /**
   * Navega para um diretório
   */
  const navigate = useCallback(
    (path: string) => {
      if (!pyodide || loading) return

      try {
        const FS = pyodide.FS
        const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '') || '/'
        
        const stat = FS.stat(normalizedPath)
        if (FS.isDir(stat.mode)) {
          setCurrentPath(normalizedPath)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Diretório não encontrado')
      }
    },
    [pyodide, loading]
  )

  /**
   * Navega para o diretório pai
   */
  const navigateUp = useCallback(() => {
    if (currentPath === '/') return

    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
    navigate(parentPath)
  }, [currentPath, navigate])

  /**
   * Cria um arquivo
   */
  const createFile = useCallback(
    (name: string, content: string = '', path?: string): boolean => {
      if (!pyodide || loading) return false

      try {
        const FS = pyodide.FS
        const targetPath = path || currentPath
        const normalizedPath = targetPath === '/' ? '/' : targetPath.replace(/\/$/, '') || '/'
        const filePath = normalizedPath === '/' 
          ? `/${name}` 
          : `${normalizedPath}/${name}`

        // Verificar se já existe
        try {
          FS.stat(filePath)
          setError('Arquivo já existe')
          return false
        } catch {
          // Arquivo não existe, pode criar
        }

        // Criar arquivo
        FS.writeFile(filePath, content, { encoding: 'utf8' })
        refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao criar arquivo')
        return false
      }
    },
    [pyodide, loading, currentPath, refresh]
  )

  /**
   * Cria um diretório
   */
  const createDirectory = useCallback(
    (name: string, path?: string): boolean => {
      if (!pyodide || loading) return false

      try {
        const FS = pyodide.FS
        const targetPath = path || currentPath
        const normalizedPath = targetPath === '/' ? '/' : targetPath.replace(/\/$/, '') || '/'
        const dirPath = normalizedPath === '/' 
          ? `/${name}` 
          : `${normalizedPath}/${name}`

        // Verificar se já existe
        try {
          FS.stat(dirPath)
          setError('Diretório já existe')
          return false
        } catch {
          // Diretório não existe, pode criar
        }

        // Criar diretório
        FS.mkdir(dirPath)
        refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao criar diretório')
        return false
      }
    },
    [pyodide, loading, currentPath, refresh]
  )

  /**
   * Deleta um arquivo ou diretório
   */
  const deleteEntry = useCallback(
    (path: string): boolean => {
      if (!pyodide || loading) return false

      try {
        const FS = pyodide.FS
        const stat = FS.stat(path)
        const isDirectory = FS.isDir(stat.mode)

        if (isDirectory) {
          // Deletar diretório recursivamente
          const entries = FS.readdir(path)
          for (const entry of entries) {
            if (entry !== '.' && entry !== '..') {
              const entryPath = path === '/' 
                ? `/${entry}` 
                : `${path}/${entry}`
              deleteEntry(entryPath)
            }
          }
          FS.rmdir(path)
        } else {
          FS.unlink(path)
        }

        refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao deletar')
        return false
      }
    },
    [pyodide, loading, refresh]
  )

  /**
   * Lê o conteúdo de um arquivo
   */
  const readFile = useCallback(
    (path: string): string | null => {
      if (!pyodide || loading) return null

      try {
        const FS = pyodide.FS
        const stat = FS.stat(path)
        
        if (FS.isDir(stat.mode)) {
          setError('Não é possível ler um diretório')
          return null
        }

        const content = FS.readFile(path, { encoding: 'utf8' })
        return content as string
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao ler arquivo')
        return null
      }
    },
    [pyodide, loading]
  )

  /**
   * Escreve conteúdo em um arquivo
   */
  const writeFile = useCallback(
    (path: string, content: string): boolean => {
      if (!pyodide || loading) return false

      try {
        const FS = pyodide.FS
        FS.writeFile(path, content, { encoding: 'utf8' })
        refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao escrever arquivo')
        return false
      }
    },
    [pyodide, loading, refresh]
  )

  /**
   * Renomeia um arquivo ou diretório
   */
  const renameEntry = useCallback(
    (oldPath: string, newName: string): boolean => {
      if (!pyodide || loading) return false

      try {
        const FS = pyodide.FS
        const parentPath = oldPath.split('/').slice(0, -1).join('/') || '/'
        const newPath = parentPath === '/' 
          ? `/${newName}` 
          : `${parentPath}/${newName}`

        // Verificar se novo nome já existe
        try {
          FS.stat(newPath)
          setError('Já existe um arquivo/diretório com esse nome')
          return false
        } catch {
          // Nome disponível
        }

        FS.rename(oldPath, newPath)
        refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao renomear')
        return false
      }
    },
    [pyodide, loading, refresh]
  )

  /**
   * Faz upload de um arquivo do sistema para o FS virtual
   */
  const uploadFile = useCallback(
    async (file: File, targetPath?: string): Promise<boolean> => {
      if (!pyodide || loading) return false

      try {
        const content = await file.text()
        const path = targetPath || currentPath
        const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '') || '/'
        const filePath = normalizedPath === '/' 
          ? `/${file.name}` 
          : `${normalizedPath}/${file.name}`

        return createFile(file.name, content, normalizedPath)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao fazer upload')
        return false
      }
    },
    [pyodide, loading, currentPath, createFile]
  )

  /**
   * Faz download de um arquivo do FS virtual
   */
  const downloadFile = useCallback(
    (path: string): boolean => {
      if (!pyodide || loading) return false

      try {
        const content = readFile(path)
        if (content === null) return false

        const fileName = path.split('/').pop() || 'file'
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao fazer download')
        return false
      }
    },
    [pyodide, loading, readFile]
  )

  // Atualizar lista quando pyodide carregar ou path mudar
  useEffect(() => {
    if (pyodide && !loading) {
      refresh()
    }
  }, [pyodide, loading, currentPath, refresh])

  return {
    files,
    currentPath,
    isLoading,
    error,
    createFile,
    createDirectory,
    deleteEntry,
    readFile,
    writeFile,
    navigate,
    navigateUp,
    refresh,
    uploadFile,
    downloadFile,
    renameEntry,
  }
}
