'use client'

import { useState, useRef } from 'react'
import { usePyodide } from '@/hooks/usePyodide'
import { PythonEditor } from '@/components/PythonEditor'
import { OutputTerminal } from '@/components/OutputTerminal'
import { ThemeToggle } from '@/components/ThemeToggle'

const DEFAULT_CODE = `# Bem-vindo ao Interpretador Python Web!
# Digite seu código Python aqui e clique em "Executar Código"

print("Olá, mundo!")
print("Python está funcionando! 🐍")

# Exemplo: calcular a soma de números
numeros = [1, 2, 3, 4, 5]
soma = sum(numeros)
print(f"A soma de {numeros} é {soma}")

# Exemplo: loop
for i in range(3):
    print(f"Contagem: {i}")`

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [output, setOutput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [hasError, setHasError] = useState(false)
  const outputBufferRef = useRef<string[]>([])

  const { pyodide, loading, error } = usePyodide()

  const executeCode = async () => {
    if (!pyodide || loading || isExecuting) return

    setIsExecuting(true)
    setOutput('')
    setHasError(false)
    outputBufferRef.current = []

    try {
      // Configurar captura de stdout e stderr
      pyodide.setStdout({
        batched: (text: string) => {
          outputBufferRef.current.push(text)
        },
      })

      pyodide.setStderr({
        batched: (text: string) => {
          outputBufferRef.current.push(text)
          setHasError(true)
        },
      })

      // Executar o código
      const result = await pyodide.runPythonAsync(code)

      // Combinar stdout/stderr com o resultado
      let finalOutput = outputBufferRef.current.join('')
      
      // Se houver um resultado de retorno (não apenas print), adicionar
      if (result !== undefined && result !== null && result !== '') {
        const resultStr = String(result)
        // Só adicionar se não for None (comum em Python)
        if (resultStr !== 'None') {
          if (finalOutput) {
            finalOutput += `\n${resultStr}`
          } else {
            finalOutput = resultStr
          }
        }
      }

      setOutput(finalOutput || 'Código executado com sucesso!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      // Formatar traceback se disponível
      let errorOutput = `Erro: ${errorMessage}`
      
      // Tentar obter mais detalhes do erro
      if (err && typeof err === 'object' && 'message' in err) {
        errorOutput = String(err)
      }
      
      setOutput(errorOutput)
      setHasError(true)
    } finally {
      setIsExecuting(false)
      outputBufferRef.current = []
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Interpretador Python Web
            </h1>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 font-medium">
              Erro ao carregar Pyodide: {error}
            </p>
            <p className="text-red-600 dark:text-red-300 text-sm mt-2">
              Verifique sua conexão com a internet e tente recarregar a página.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Editor Section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="h-[400px] sm:h-[500px]">
                <PythonEditor
                  code={code}
                  onChange={setCode}
                  disabled={loading || isExecuting}
                />
              </div>
            </div>

            {/* Execute Button */}
            <div className="flex justify-center">
              <button
                onClick={executeCode}
                disabled={loading || isExecuting || !pyodide}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
              >
                {isExecuting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Executando...</span>
                  </>
                ) : loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Carregando Pyodide...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Executar Código</span>
                  </>
                )}
              </button>
            </div>

            {/* Terminal Section */}
            <div className="h-[300px] sm:h-[400px]">
              <OutputTerminal
                output={output}
                isError={hasError}
                isLoading={loading}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Powered by{' '}
            <a
              href="https://pyodide.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Pyodide
            </a>
            {' '}e{' '}
            <a
              href="https://nextjs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Next.js
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

