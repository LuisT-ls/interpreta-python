'use client'

import { useState, useEffect, useRef } from 'react'

interface FindReplaceBarProps {
  code: string
  onFind: (searchTerm: string, matchCase: boolean, wholeWord: boolean) => void
  onReplace: (searchTerm: string, replaceTerm: string, matchCase: boolean, wholeWord: boolean, replaceAll: boolean) => void
  onClose: () => void
  mode: 'find' | 'replace'
  currentMatch?: { index: number; count: number }
}

export function FindReplaceBar({
  code,
  onFind,
  onReplace,
  onClose,
  mode,
  currentMatch,
}: FindReplaceBarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focar no input de busca quando o componente for montado
    if (mode === 'find' && searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.select()
    } else if (mode === 'replace' && replaceInputRef.current) {
      replaceInputRef.current.focus()
    }
  }, [mode])

  // Usar debounce para buscar apenas após o usuário parar de digitar
  useEffect(() => {
    if (!searchTerm) {
      // Limpar busca se o campo estiver vazio
      onFind('', matchCase, wholeWord)
      return
    }

    // Debounce: aguardar 300ms após o usuário parar de digitar
    const timeoutId = setTimeout(() => {
      onFind(searchTerm, matchCase, wholeWord)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, matchCase, wholeWord, onFind])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, inputType: 'search' | 'replace') => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (inputType === 'search') {
        // Enter na busca: próxima ocorrência
        onFind(searchTerm, matchCase, wholeWord)
      } else if (inputType === 'replace' && mode === 'replace') {
        // Enter na substituição: substituir atual
        onReplace(searchTerm, replaceTerm, matchCase, wholeWord, false)
      }
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      // Shift+Enter: ocorrência anterior
      // (implementar navegação reversa se necessário)
    }
  }

  const handleReplace = (replaceAll: boolean = false) => {
    if (!searchTerm) return
    onReplace(searchTerm, replaceTerm, matchCase, wholeWord, replaceAll)
  }

  return (
    <div className="absolute top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg z-50">
      <div className="flex items-center gap-2 p-2">
        {/* Campo de Busca */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex items-center gap-1 flex-1">
            <svg
              className="w-4 h-4 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'search')}
              placeholder="Buscar..."
              className="flex-1 px-2 py-1 text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
              autoFocus
            />
            {currentMatch && searchTerm && (
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {currentMatch.index > 0 ? `${currentMatch.index} de ` : ''}
                {currentMatch.count}
              </span>
            )}
          </div>

          {/* Opções de Busca */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMatchCase(!matchCase)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                matchCase
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              title="Diferenciar maiúsculas/minúsculas"
            >
              Aa
            </button>
            <button
              onClick={() => setWholeWord(!wholeWord)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                wholeWord
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              title="Palavra inteira"
            >
              Ab
            </button>
          </div>
        </div>

        {/* Campo de Substituição (apenas no modo replace) */}
        {mode === 'replace' && (
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1 flex-1">
              <svg
                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <input
                ref={replaceInputRef}
                type="text"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'replace')}
                placeholder="Substituir por..."
                className="flex-1 px-2 py-1 text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
              />
            </div>

            {/* Botões de Substituição */}
            <button
              onClick={() => handleReplace(false)}
              disabled={!searchTerm}
              className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              Substituir
            </button>
            <button
              onClick={() => handleReplace(true)}
              disabled={!searchTerm}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              Substituir Tudo
            </button>
          </div>
        )}

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded transition-colors"
          title="Fechar (Esc)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
