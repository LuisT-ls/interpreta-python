'use client'

import { useState, useEffect } from 'react'
import { useFileSystem } from '@/hooks/useFileSystem'

interface FileEditorProps {
  pyodide: any
  loading: boolean
  filePath: string | null
  onClose: () => void
}

export function FileEditor({ pyodide, loading, filePath, onClose }: FileEditorProps) {
  const { readFile, writeFile } = useFileSystem({ pyodide, loading })
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (filePath) {
      const fileContent = readFile(filePath)
      setContent(fileContent || '')
      setError(null)
    }
  }, [filePath, readFile])

  const handleSave = () => {
    if (!filePath) return

    setIsSaving(true)
    setError(null)

    const success = writeFile(filePath, content)
    if (success) {
      setIsSaving(false)
      // Opcional: mostrar notificação de sucesso
      setTimeout(() => {
        onClose()
      }, 300)
    } else {
      setIsSaving(false)
      setError('Erro ao salvar arquivo')
    }
  }

  if (!filePath) return null

  const fileName = filePath.split('/').pop() || 'arquivo'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[80vh] bg-white dark:bg-gray-900 rounded-lg shadow-xl flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{fileName}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{filePath}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Fechar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-0 resize-none focus:outline-none focus:ring-0"
            placeholder="Digite o conteúdo do arquivo..."
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {content.length} caracteres
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

