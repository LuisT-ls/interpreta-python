'use client'

import { useRef, useEffect } from 'react'

interface PythonEditorProps {
  code: string
  onChange: (code: string) => void
  disabled?: boolean
}

export function PythonEditor({ code, onChange, disabled }: PythonEditorProps) {
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
      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          editor.py
        </span>
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

