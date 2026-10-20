'use client'

import { useRef, useEffect, useState } from 'react'
import { MatplotlibPlot } from './MatplotlibPlot'
import { MatplotlibPlot as MatplotlibPlotType } from '@/hooks/useEditorTabs'
import type { ToastVariant } from '@/hooks/useToast'

interface OutputTerminalProps {
  output: string
  isError?: boolean
  errorLine?: number | null
  isLoading?: boolean
  isWaitingInput?: boolean
  inputPrompt?: string
  onInputSubmit?: (value: string) => void
  onGoToError?: () => void
  onClear?: () => void
  onNotify?: (message: string, variant?: ToastVariant) => void
  plots?: MatplotlibPlotType[]
}

export function OutputTerminal({
  output,
  isError = false,
  errorLine = null,
  isLoading = false,
  isWaitingInput = false,
  inputPrompt = '',
  onInputSubmit,
  onGoToError,
  onClear,
  onNotify,
  plots = []
}: OutputTerminalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const copiedTimeoutRef = useRef<number | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => () => {
    if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current)
  }, [])

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

  const handleCopyOutput = async () => {
    if (!output) return

    try {
      if (!navigator.clipboard) throw new Error('A cópia não está disponível neste navegador.')
      await navigator.clipboard.writeText(output)
      setIsCopied(true)
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current)
      copiedTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 2000)
      onNotify?.('Saída copiada para a área de transferência.')
    } catch (error) {
      setIsCopied(false)
      onNotify?.(error instanceof Error ? error.message : 'Não foi possível copiar a saída.', 'error')
    }
  }

  const handleExportOutput = () => {
    if (!output) return
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'saida-terminal.txt'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    onNotify?.('Saída exportada como arquivo de texto.')
  }

  return (
    <div className="relative h-full flex flex-col bg-black rounded-lg overflow-hidden border border-gray-800">
      <div className="px-3 py-2 bg-gray-900 border-b border-gray-800 flex flex-wrap items-center gap-2 flex-shrink-0 relative sm:px-4">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" aria-hidden="true"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500" aria-hidden="true"></div>
          <div className="w-3 h-3 rounded-full bg-green-500" aria-hidden="true"></div>
        </div>
        <span className="text-xs text-gray-400 ml-1 sm:ml-2">Terminal</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button type="button" onClick={handleCopyOutput} disabled={!output} className="rounded px-2 py-1 text-[11px] text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Copiar saída do terminal">
            {isCopied ? 'Copiado' : 'Copiar'}
          </button>
          <button type="button" onClick={handleExportOutput} disabled={!output} className="rounded px-2 py-1 text-[11px] text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Exportar saída do terminal como arquivo de texto">
            Exportar
          </button>
          <button type="button" onClick={onClear} disabled={(!output && plots.length === 0) || !onClear} className="rounded px-2 py-1 text-[11px] text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Limpar saída do terminal">
            Limpar
          </button>
        </div>
      </div>
      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-4"
        role="region"
        tabIndex={0}
        aria-label="Terminal de saída do código Python"
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-green-400">
            <div className="animate-spin">⏳</div>
            <span>Carregando Pyodide...</span>
          </div>
        ) : (
          <>
            {isError && (
              <div className="mb-3 flex flex-col gap-2 rounded-lg border border-red-900/70 bg-red-950/50 p-3 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between" role="alert">
                <div>
                  <p className="font-semibold">Não foi possível executar o código.</p>
                  <p className="mt-0.5 text-xs text-red-200/80">
                    {errorLine ? `Verifique a linha ${errorLine} ou leia o traceback abaixo.` : 'Leia o traceback abaixo para identificar o problema.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {errorLine && onGoToError && (
                    <button
                      type="button"
                      onClick={onGoToError}
                      className="rounded-md border border-red-700 bg-red-900/70 px-2.5 py-1.5 text-xs font-semibold text-red-100 transition-colors hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      Ir para linha {errorLine}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Renderizar gráficos matplotlib */}
            {plots.map((plot) => (
              <MatplotlibPlot
                key={plot.id}
                id={plot.id}
                imageData={plot.imageData}
                width={plot.width}
                height={plot.height}
              />
            ))}
            
            {output && (
              <pre
                className={`font-mono text-sm whitespace-pre-wrap break-words ${isError ? 'text-red-400' : 'text-green-400'
                  }`}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                role="log"
                aria-live="polite"
                aria-relevant="additions text"
                aria-label="Saída do código Python"
              >
                {/* Zero-width space prevents browser from stripping leading newlines */}
                {'\u200B'}{output}
              </pre>
            )}
            {isWaitingInput && (
              <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2">
                <span id="terminal-input-prompt" className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                  {inputPrompt}
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  aria-labelledby="terminal-input-prompt"
                  autoComplete="off"
                  className="flex-1 bg-transparent border-none outline-none text-green-400 font-mono text-sm focus:ring-0"
                  autoFocus
                  style={{ caretColor: 'rgb(74, 222, 128)' }}
                />
              </form>
            )}
            {!output && !plots.length && !isWaitingInput && (
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
