'use client'

interface OutputTerminalProps {
  output: string
  isError?: boolean
  isLoading?: boolean
}

export function OutputTerminal({ output, isError = false, isLoading = false }: OutputTerminalProps) {
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
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-green-400">
            <div className="animate-spin">⏳</div>
            <span>Carregando Pyodide...</span>
          </div>
        ) : output ? (
          <pre 
            className={`font-mono text-sm whitespace-pre-wrap break-words ${
              isError ? 'text-red-400' : 'text-green-400'
            }`}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {output}
          </pre>
        ) : (
          <div className="text-gray-500 font-mono text-sm">
            {isError ? 'Erro ao executar código' : 'Nenhuma saída ainda. Execute seu código para ver os resultados.'}
          </div>
        )}
      </div>
    </div>
  )
}

