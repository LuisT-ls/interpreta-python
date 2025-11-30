'use client'

import { useRef, useEffect } from 'react'

interface PythonEditorProps {
  code: string
  onChange: (code: string) => void
  disabled?: boolean
  onImport?: () => void
  onExport?: () => void
}

export function PythonEditor({ code, onChange, disabled, onImport, onExport }: PythonEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Auto-resize do textarea
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [code])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    // Mapeamento de caracteres de abertura para fechamento
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
    }

    // Tratamento para Tab
    if (e.key === 'Tab') {
      e.preventDefault()
      const newCode = code.substring(0, start) + '    ' + code.substring(end)
      onChange(newCode)
      
      // Restaurar posição do cursor
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4
      }, 0)
      return
    }

    // Tratamento para Backspace - remove o par se ambos estiverem juntos
    if (e.key === 'Backspace' && start === end && start > 0) {
      const charBefore = code[start - 1]
      const charAfter = code[start]
      
      // Verifica se há um par de caracteres idênticos (aspas)
      if ((charBefore === '"' && charAfter === '"') || 
          (charBefore === "'" && charAfter === "'")) {
        e.preventDefault()
        const newCode = code.substring(0, start - 1) + code.substring(start + 1)
        onChange(newCode)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start - 1
        }, 0)
        return
      }

      // Verifica se há um par de caracteres diferentes (parênteses, colchetes, chaves)
      for (const [open, close] of Object.entries(pairs)) {
        if (charBefore === open && charAfter === close) {
          e.preventDefault()
          const newCode = code.substring(0, start - 1) + code.substring(start + 1)
          onChange(newCode)
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start - 1
          }, 0)
          return
        }
      }
    }

    // Tratamento para caracteres de abertura - insere o fechamento automaticamente
    if (pairs[e.key] && start === end) {
      const beforeChar = code[start - 1] || ''
      const afterChar = code[start] || ''

      // Só insere o fechamento se:
      // 1. O caractere anterior não é um escape (\)
      // 2. Não há um caractere de fechamento já presente logo após
      if (beforeChar !== '\\' && afterChar !== pairs[e.key]) {
        e.preventDefault()
        const closingChar = pairs[e.key]
        const newCode =
          code.substring(0, start) +
          e.key +
          closingChar +
          code.substring(end)

        onChange(newCode)

        // Posiciona o cursor entre os caracteres
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1
        }, 0)
        return
      }
    }

    // Tratamento para Delete - remove o par se ambos estiverem juntos
    if (e.key === 'Delete' && start === end && start < code.length) {
      const charAt = code[start]
      const charAfter = code[start + 1]
      
      // Verifica se há um par de caracteres idênticos (aspas)
      if ((charAt === '"' && charAfter === '"') || 
          (charAt === "'" && charAfter === "'")) {
        e.preventDefault()
        const newCode = code.substring(0, start) + code.substring(start + 2)
        onChange(newCode)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start
        }, 0)
        return
      }

      // Verifica se há um par de caracteres diferentes
      for (const [open, close] of Object.entries(pairs)) {
        if (charAt === open && charAfter === close) {
          e.preventDefault()
          const newCode = code.substring(0, start) + code.substring(start + 2)
          onChange(newCode)
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start
          }, 0)
          return
        }
      }
    }
  }

  return (
    <div className="relative h-full flex flex-col">
      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          editor.py
        </span>
        <div className="flex items-center gap-2">
          {onImport && (
            <button
              onClick={onImport}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Importar código"
              aria-label="Importar código"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Exportar código"
              aria-label="Exportar código"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="flex-1 w-full p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder="Digite seu código Python aqui..."
        spellCheck={false}
      />
    </div>
  )
}

