'use client'

import { useState, useRef } from 'react'
import { useFileSystem, FileSystemEntry } from '@/hooks/useFileSystem'

interface FileSystemSidebarProps {
  pyodide: any
  loading: boolean
  isOpen: boolean
  onToggle: () => void
  onFileSelect?: (path: string) => void
}

export function FileSystemSidebar({
  pyodide,
  loading,
  isOpen,
  onToggle,
  onFileSelect,
}: FileSystemSidebarProps) {
  const {
    files,
    currentPath,
    isLoading,
    error,
    createFile,
    createDirectory,
    deleteEntry,
    navigate,
    navigateUp,
    refresh,
    uploadFile,
    downloadFile,
    renameEntry,
  } = useFileSystem({ pyodide, loading })

  const [isCreating, setIsCreating] = useState<'file' | 'directory' | null>(null)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCreate = () => {
    if (!newName.trim()) return

    const success = isCreating === 'file'
      ? createFile(newName.trim(), '')
      : createDirectory(newName.trim())

    if (success) {
      setIsCreating(null)
      setNewName('')
    }
  }

  const handleDelete = (path: string) => {
    if (confirm('Tem certeza que deseja deletar este item?')) {
      deleteEntry(path)
    }
  }

  const handleRename = (path: string, currentName: string) => {
    setRenaming(path)
    setRenameValue(currentName)
  }

  const handleRenameSubmit = () => {
    if (!renameValue.trim() || !renaming) return

    const success = renameEntry(renaming, renameValue.trim())
    if (success) {
      setRenaming(null)
      setRenameValue('')
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await uploadFile(file)
      event.target.value = ''
    }
  }

  const formatSize = (bytes?: number): string => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Quando fechado, não renderizar nada (o botão será renderizado no layout principal se necessário)
  if (!isOpen) {
    return null
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Explorador</h2>
        </div>
        <button
          onClick={onToggle}
          className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          title="Fechar"
          aria-label="Fechar Sistema de Arquivos"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30">
        <button
          onClick={refresh}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          title="Atualizar"
          aria-label="Atualizar lista de arquivos"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          onClick={() => setIsCreating('file')}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          title="Novo arquivo"
          aria-label="Criar novo arquivo"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button
          onClick={() => setIsCreating('directory')}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          title="Nova pasta"
          aria-label="Criar nova pasta"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          title="Upload arquivo"
          aria-label="Fazer upload de arquivo"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-500 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        {currentPath !== '/' && (
          <button
            onClick={navigateUp}
            className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            title="Diretório pai"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <span className="truncate font-mono">{currentPath}</span>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30">
          {error}
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-gray-400 dark:text-gray-500">
            Carregando...
          </div>
        ) : files.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400 dark:text-gray-500">
            Diretório vazio
          </div>
        ) : (
          <div className="py-1">
            {files.map((entry) => (
              <div
                key={entry.path}
                className="group flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
              >
                {renaming === entry.path ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit()
                        if (e.key === 'Escape') {
                          setRenaming(null)
                          setRenameValue('')
                        }
                      }}
                      onBlur={handleRenameSubmit}
                      className="flex-1 px-2 py-0.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100"
                      autoFocus
                    />
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        if (entry.isDirectory) {
                          navigate(entry.path)
                        } else if (onFileSelect) {
                          onFileSelect(entry.path)
                        }
                      }}
                      className="flex-1 flex items-center gap-2 text-left min-w-0"
                    >
                      {entry.isDirectory ? (
                        <svg className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1 font-mono">
                        {entry.name}
                      </span>
                      {!entry.isDirectory && entry.size !== undefined && (
                        <span className="text-xs text-gray-400 dark:text-gray-600 flex-shrink-0 font-mono">
                          {formatSize(entry.size)}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!entry.isDirectory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadFile(entry.path)
                          }}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          title="Download"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRename(entry.path, entry.name)
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                        title="Renomear"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(entry.path)
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                        title="Deletar"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create file/directory modal */}
      {isCreating && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setIsCreating(null)
            setNewName('')
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {isCreating === 'file' ? 'Novo Arquivo' : 'Nova Pasta'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(null)
                  setNewName('')
                }}
                className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Fechar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nome
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') {
                      setIsCreating(null)
                      setNewName('')
                    }
                  }}
                  placeholder={isCreating === 'file' ? 'nome_arquivo.txt' : 'nome_pasta'}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setIsCreating(null)
                    setNewName('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
