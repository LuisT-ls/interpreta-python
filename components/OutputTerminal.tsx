'use client'

import { useRef, useEffect } from 'react'

interface OutputTerminalProps {
  output: string
  isError?: boolean
  isLoading?: boolean
  isWaitingInput?: boolean
  inputPrompt?: string
  onInputSubmit?: (value: string) => void
}

export function OutputTerminal({
  output,
  isError = false,
  isLoading = false,
  isWaitingInput = false,
  inputPrompt = '',
  onInputSubmit
}: OutputTerminalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isWaitingInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isWaitingInput])

  useEffect(() => {
    // Auto-scroll para o final quando houver nova saída
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output, isWaitingInput])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = inputRef.current?.value || ''
    if (onInputSubmit) {
      onInputSubmit(value)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <div className="relative h-full flex flex-col bg-black rounded-lg overflow-hidden border border-gray-800">
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-xs text-gray-400 ml-2">Terminal</span>
      </div>
      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-4"
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-green-400">
            <div className="animate-spin">⏳</div>
            <span>Carregando Pyodide...</span>
          </div>
        ) : (
          <>
            {output && (
              <pre
                className={`font-mono text-sm whitespace-pre-wrap break-words ${isError ? 'text-red-400' : 'text-green-400'
                  }`}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {/* Zero-width space prevents browser from stripping leading newlines */}
                {'\u200B'}{output}
              </pre>
            )}
            {isWaitingInput && (
              <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2">
                <span className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                  {inputPrompt}
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 bg-transparent border-none outline-none text-green-400 font-mono text-sm focus:ring-0"
                  autoFocus
                  style={{ caretColor: 'rgb(74, 222, 128)' }}
                />
              </form>
            )}
            {!output && !isWaitingInput && (
              <div className="text-gray-500 font-mono text-sm">
                {isError ? 'Erro ao executar código' : 'Nenhuma saída ainda. Execute seu código para ver os resultados.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
