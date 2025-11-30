'use client'

import { useState, useRef, useCallback } from 'react'
import JSZip from 'jszip'
import { usePyodide } from '@/hooks/usePyodide'
import { useLayout } from '@/hooks/useLayout'
import { useEditorTabs } from '@/hooks/useEditorTabs'
import { PythonEditor } from '@/components/PythonEditor'
import { OutputTerminal } from '@/components/OutputTerminal'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LayoutSelector } from '@/components/LayoutSelector'
import { EditorTabs } from '@/components/EditorTabs'
import { ExportMenu } from '@/components/ExportMenu'

export default function Home() {
  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    createNewTab,
    closeTab,
    updateTabCode,
    updateTabOutput,
  } = useEditorTabs()

  const [isExecuting, setIsExecuting] = useState(false)
  const outputBufferRef = useRef<string[]>([])
  
  // Estados para controle de input inline no terminal
  const [isWaitingInput, setIsWaitingInput] = useState(false)
  const [inputPrompt, setInputPrompt] = useState('')
  const inputResolveRef = useRef<((value: string) => void) | null>(null)
  const inputRejectRef = useRef<(() => void) | null>(null)

  const { pyodide, loading, error } = usePyodide()
  const { layout, changeLayout, isMounted } = useLayout()

  // Referência para o input de arquivo (oculto)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Função para exportar apenas a aba atual como arquivo .py
  const exportCurrentTab = useCallback(() => {
    const blob = new Blob([activeTab.code], { type: 'text/x-python' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = activeTab.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [activeTab])

  // Função para exportar todas as abas como arquivo .zip
  const exportAllTabs = useCallback(async () => {
    const zip = new JSZip()
    
    // Adicionar cada aba como um arquivo .py no ZIP
    tabs.forEach((tab) => {
      zip.file(tab.name, tab.code)
    })

    // Gerar o arquivo ZIP
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'editores.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [tabs])

  // Função para importar código de um arquivo .py
  const importCode = () => {
    fileInputRef.current?.click()
  }

  // Handler para quando um arquivo é selecionado
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Verificar se é um arquivo .py
    if (!file.name.endsWith('.py')) {
      alert('Por favor, selecione um arquivo .py')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        updateTabCode(activeTabId, content)
      }
    }
    reader.onerror = () => {
      alert('Erro ao ler o arquivo')
    }
    reader.readAsText(file)

    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    event.target.value = ''
  }

  const executeCode = async () => {
    if (!pyodide || loading || isExecuting) return

    setIsExecuting(true)
    updateTabOutput(activeTabId, '', false)
    outputBufferRef.current = []

    try {
      // Configurar captura de stdout e stderr usando batched
      // IMPORTANTE: O batched envia cada print() como um chunk separado, mas sem \n
      // Precisamos adicionar \n ao final de cada chunk para preservar as quebras de linha
      // Usar handlers estáveis para evitar problemas de I/O
      const stdoutHandler = (text: string) => {
        try {
          if (text && typeof text === 'string' && text.length > 0) {
            // O texto já pode conter \n dentro dele (como em print("\ntexto"))
            // Não adicionar \n extra se o texto já termina com \n
            // Mas adicionar \n se não terminar, pois cada print() adiciona uma quebra
            if (text.endsWith('\n')) {
              outputBufferRef.current.push(text)
            } else {
              outputBufferRef.current.push(text + '\n')
            }
          }
        } catch (e) {
          // Ignorar erros no handler para evitar loops
          console.error('Erro no stdout handler:', e)
        }
      }

      const stderrHandler = (text: string) => {
        try {
          if (text && typeof text === 'string' && text.length > 0) {
            outputBufferRef.current.push(text + '\n')
            // O erro será marcado quando atualizarmos a saída
          }
        } catch (e) {
          // Ignorar erros no handler para evitar loops
          console.error('Erro no stderr handler:', e)
        }
      }

      // Configurar handlers de forma segura
      try {
        pyodide.setStdout({
          batched: stdoutHandler,
        })

        pyodide.setStderr({
          batched: stderrHandler,
        })
      } catch (configError) {
        console.error('Erro ao configurar handlers:', configError)
        // Continuar mesmo se houver erro na configuração
      }

      // Substituir input() do Python por um sistema que usa input inline no terminal
      // Função que será chamada pelo Python quando input() for executado
      const requestInput = (prompt: string) => {
        return new Promise<string>((resolve, reject) => {
          inputResolveRef.current = resolve
          inputRejectRef.current = reject
          setInputPrompt(String(prompt) || '')
          setIsWaitingInput(true)
        })
      }

      // Expor a função diretamente no globals do Pyodide
      pyodide.globals.set('__js_request_input', requestInput)

      // Substituir input() do Python para usar await diretamente
      // Como o código será executado de forma assíncrona, podemos usar await
      pyodide.runPython(`
import builtins

_original_input = builtins.input

# Obter a função do globals
__js_request_input = globals()['__js_request_input']

async def input(prompt=''):
    prompt_str = str(prompt) if prompt else ''
    result = await __js_request_input(prompt_str)
    if result is None:
        raise EOFError("EOF when reading a line")
    return result

builtins.input = input
      `)

      // Executar o código de forma assíncrona para suportar input()
      // Separar imports do resto do código de forma mais robusta
      const lines = activeTab.code.split('\n')
      const imports: string[] = []
      const codeLines: string[] = []
      
      // Separar imports e código
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()
        
        // Pular linhas vazias no início
        if (trimmed.length === 0 && imports.length === 0 && codeLines.length === 0) {
          continue
        }
        
        // Detectar imports (incluindo imports com comentários inline)
        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
          // Remover comentários inline dos imports se houver
          const importLine = trimmed.split('#')[0].trim()
          if (importLine) {
            imports.push(importLine)
          }
        } else {
          // Adicionar todas as outras linhas ao código
          codeLines.push(line)
        }
      }
      
      // Transformar o código para que input() funcione automaticamente
      let transformedCode = codeLines.join('\n')
      
      // Substituir input() em atribuições simples: variavel = input(...)
      transformedCode = transformedCode.replace(
        /(\s+)(\w+)\s*=\s*input\(/g,
        '$1$2 = await input('
      )
      
      // Substituir input() dentro de int(), float(), etc: variavel = int(input(...))
      transformedCode = transformedCode.replace(
        /(\s+)(\w+)\s*=\s*(int|float|str)\(input\(/g,
        '$1$2 = $3(await input('
      )
      
      // Substituir input() em outros contextos: if input(...), return input(...), etc
      transformedCode = transformedCode.replace(
        /(\s+)(if|return|print|assert)\s*\(.*?input\(/g,
        (match) => {
          // Substituir apenas o input() dentro da expressão
          return match.replace(/input\(/g, 'await input(')
        }
      )
      
      // Construir o código final com imports no nível superior
      // Garantir que os imports sejam executados primeiro
      const importsCode = imports.length > 0 ? imports.join('\n') + '\n\n' : ''
      const indentedCode = transformedCode.split('\n').map(line => {
        // Não indentar linhas vazias
        if (line.trim().length === 0) return ''
        return '    ' + line
      }).join('\n')
      
      const wrappedCode = `${importsCode}async def _run_code():\n${indentedCode}\n\n# Executar o código assíncrono\nawait _run_code()`
      
      // Debug: verificar se os imports estão sendo capturados
      console.log('=== DEBUG EXECUÇÃO ===')
      console.log('Imports detectados:', imports.length > 0 ? imports : 'Nenhum import detectado')
      console.log('Total de linhas do código original:', lines.length)
      console.log('Linhas de código (sem imports):', codeLines.length)
      console.log('Primeiras 5 linhas do código original:', lines.slice(0, 5))
      console.log('Código final (primeiras 30 linhas):')
      console.log(wrappedCode.split('\n').slice(0, 30).join('\n'))
      console.log('======================')
      
      const result = await pyodide.runPythonAsync(wrappedCode)

      // Combinar stdout/stderr com o resultado
      // Juntar todos os chunks - cada chunk já tem \n no final agora
      let finalOutput = outputBufferRef.current.join('')
      
      // IMPORTANTE: Não adicionar \n extra se o chunk já termina com \n
      // Isso garante que \n dentro das strings sejam preservados corretamente
      finalOutput = finalOutput.replace(/\n\n+/g, '\n\n') // Limitar múltiplas quebras consecutivas
      
      // Normalizar quebras de linha (converter \r\n para \n)
      finalOutput = finalOutput.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      
      // Remover quebras de linha extras no final (mas manter pelo menos uma se houver conteúdo)
      finalOutput = finalOutput.replace(/\n+$/, finalOutput.trim() ? '\n' : '')
      
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

      // Não usar trim() para preservar quebras de linha no início/fim se necessário
      // Apenas remover espaços em branco extras, mas manter quebras de linha
      updateTabOutput(activeTabId, finalOutput || 'Código executado com sucesso!', false)
    } catch (err) {
      // Capturar qualquer saída que possa ter sido gerada antes do erro
      const capturedOutput = outputBufferRef.current.join('')
      
      const errorMessage = err instanceof Error ? err.message : String(err)
      
      // Formatar traceback se disponível
      let errorOutput = ''
      
      // Se houver saída capturada antes do erro, incluir
      if (capturedOutput.trim()) {
        errorOutput = capturedOutput + '\n'
      }
      
      // Adicionar informações do erro
      if (err && typeof err === 'object') {
        // Tentar obter traceback completo se disponível
        if ('message' in err) {
          errorOutput += String(err)
        } else {
          errorOutput += `Erro: ${errorMessage}`
        }
      } else {
        errorOutput += `Erro: ${errorMessage}`
      }
      
      updateTabOutput(activeTabId, errorOutput || 'Erro ao executar código', true)
    } finally {
      setIsExecuting(false)
      // Não limpar o buffer aqui, pode conter informações úteis
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
            <div className="flex items-center gap-3">
              {isMounted && <LayoutSelector currentLayout={layout} onLayoutChange={changeLayout} />}
              <ThemeToggle />
            </div>
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
          <div className="space-y-4">
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

            {/* Layout dinâmico baseado na escolha do usuário */}
            {isMounted && (
              <div
                className={`${
                  layout === 'bottom' || layout === 'top'
                    ? 'flex flex-col gap-4'
                    : 'grid grid-cols-1 lg:grid-cols-2 gap-4'
                }`}
              >
                {/* Editor Section */}
                <div
                  className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col ${
                    layout === 'top' ? 'order-2' : layout === 'left' ? 'lg:order-2 order-1' : 'order-1'
                  }`}
                >
                  {/* Tabs */}
                  <EditorTabs
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabClick={setActiveTabId}
                    onTabClose={closeTab}
                    onNewTab={createNewTab}
                    onImport={importCode}
                    onExportCurrent={exportCurrentTab}
                    onExportAll={exportAllTabs}
                  />
                  <div className="flex-1 h-[400px] sm:h-[500px] lg:h-[600px]">
                    <PythonEditor
                      code={activeTab.code}
                      onChange={(newCode) => updateTabCode(activeTabId, newCode)}
                      disabled={loading || isExecuting}
                      fileName={activeTab.name}
                    />
                  </div>
                </div>

                {/* Terminal Section */}
                <div
                  className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden ${
                    layout === 'top' ? 'order-1' : layout === 'left' ? 'lg:order-1 order-2' : 'order-2'
                  }`}
                >
                  <div className="h-[300px] sm:h-[400px] lg:h-[600px]">
                    <OutputTerminal
                      output={activeTab.output}
                      isError={activeTab.hasError}
                      isLoading={loading}
                      isWaitingInput={isWaitingInput}
                      inputPrompt={inputPrompt}
                      onInputSubmit={(value) => {
                        setIsWaitingInput(false)
                        setInputPrompt('')
                        if (inputResolveRef.current) {
                          inputResolveRef.current(value)
                          inputResolveRef.current = null
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
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

      {/* Input oculto para importar arquivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".py"
        onChange={handleFileImport}
        className="hidden"
        aria-label="Importar arquivo Python"
      />
    </div>
  )
}

