'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import JSZip from 'jszip'
import { Panel, Group, Separator } from 'react-resizable-panels'
import { usePyodide } from '@/hooks/usePyodide'
import { useLayout } from '@/hooks/useLayout'
import { useEditorTabs } from '@/hooks/useEditorTabs'
import { useZenMode } from '@/hooks/useZenMode'
import { useSyntaxValidation } from '@/hooks/useSyntaxValidation'
import { PythonEditor } from '@/components/PythonEditor'
import { OutputTerminal } from '@/components/OutputTerminal'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AboutModal } from '@/components/AboutModal'
import { LayoutSelector } from '@/components/LayoutSelector'
import { EditorTabs } from '@/components/EditorTabs'
import { ExportMenu } from '@/components/ExportMenu'
import { CommandPalette, Command } from '@/components/CommandPalette'
import { generateShareUrl, getCodeFromUrl } from '@/utils/shareCode'

/**
 * Interface para o resultado do parsing de erros do Pyodide
 */
interface ParsedError {
  type: string
  line: number | null
  message: string
  formattedTraceback: string
  isSyntaxError: boolean
}

/**
 * Lista completa de tipos de erro Python suportados
 */
const PYTHON_ERROR_TYPES = [
  // Erros de sintaxe
  'SyntaxError',
  'IndentationError',
  'TabError',
  // Erros de nome
  'NameError',
  'UnboundLocalError',
  // Erros de tipo e valor
  'TypeError',
  'ValueError',
  'AttributeError',
  'IndexError',
  'KeyError',
  'OverflowError',
  'ZeroDivisionError',
  // Erros de importação
  'ImportError',
  'ModuleNotFoundError',
  // Erros de IO
  'FileNotFoundError',
  'PermissionError',
  'OSError',
  'IOError',
  // Erros gerais
  'AssertionError',
  'RuntimeError',
  'RecursionError',
  'MemoryError',
  'NotImplementedError',
  // Erros específicos do Pyodide
  'PyodideError',
  'JsException',
] as const

/**
 * Função utilitária para parsear erros retornados pelo Pyodide
 * Extrai tipo, linha, mensagem e formata o traceback no estilo Python
 */
function parsePyodideError(
  error: any,
  originalCode: string,
  fileName: string,
  lineMapping?: Map<number, number>
): ParsedError {
  const errorStr = String(error)
  const errorMessage = error instanceof Error ? error.message : errorStr

  // Limpar a string do erro removendo prefixos comuns
  let cleanErrorStr = errorStr
    .replace(/^PythonError:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim()

  // Inicializar valores padrão
  let errorType = 'Error'
  let errorLine: number | null = null
  let errorDetails = errorMessage
  let isSyntaxError = false

  // 1. Detectar tipo de erro
  // Verificar cada tipo de erro conhecido
  for (const errType of PYTHON_ERROR_TYPES) {
    const regex = new RegExp(`\\b${errType}\\b`, 'i')
    if (regex.test(cleanErrorStr)) {
      errorType = errType

      // Marcar erros de sintaxe
      if (['SyntaxError', 'IndentationError', 'TabError'].includes(errType)) {
        isSyntaxError = true
      }
      break
    }
  }

  // 2. Extrair linha do erro do traceback
  // Formato típico: File "<exec>", line X, in <module>
  // ou: File "<exec>", line X, in _run_code
  // ou: line X (para erros de sintaxe simples)
  // Para IndentationError: "expected an indented block after function definition on line X"

  // IMPORTANTE: O traceback pode ter múltiplas linhas. Precisamos pegar a linha mais relevante,
  // que geralmente é a última antes do erro (dentro de _run_code), não a linha do await _run_code()
  let lineMatch: RegExpMatchArray | null = null

  // Buscar todas as ocorrências de "File ..., line X"
  const allLineMatches = cleanErrorStr.matchAll(/File\s+["<](?:exec|.*?)[">],\s+line\s+(\d+)/gi)
  const lineMatchesArray = Array.from(allLineMatches)

  if (lineMatchesArray.length > 0) {
    console.debug('🔍 Linhas encontradas no traceback:', lineMatchesArray.map(m => m[1]))

    // Se houver múltiplas linhas no traceback, usar a última (mais próxima do erro)
    // A última linha geralmente é a linha dentro de _run_code onde o erro realmente ocorreu
    if (lineMatchesArray.length > 1) {
      // Pegar a última linha do traceback (mais próxima do erro)
      lineMatch = lineMatchesArray[lineMatchesArray.length - 1]
      console.debug('✅ Múltiplas linhas no traceback, usando a última (mais próxima do erro):', lineMatch[1])
    } else {
      lineMatch = lineMatchesArray[0]
      console.debug('✅ Linha única no traceback:', lineMatch[1])
    }
  }

  // Para IndentationError, procurar padrão especial: "on line X" ou "after function definition on line X"
  if (!lineMatch && (isSyntaxError || cleanErrorStr.includes('IndentationError'))) {
    // Padrão 1: "on line X" ou "at line X"
    let indentationMatch = cleanErrorStr.match(/(?:on|at)\s+line\s+(\d+)/i)
    if (!indentationMatch) {
      // Padrão 2: "after function definition on line X"
      indentationMatch = cleanErrorStr.match(/after\s+.*?\s+on\s+line\s+(\d+)/i)
    }
    if (!indentationMatch) {
      // Padrão 3: "line X" em qualquer lugar
      indentationMatch = cleanErrorStr.match(/line\s+(\d+)/i)
    }
    if (indentationMatch) {
      lineMatch = indentationMatch
      console.debug('✅ Linha extraída de IndentationError:', indentationMatch[1])
    }
  }

  // Se não encontrou no formato File, tentar formato mais simples (comum em SyntaxError)
  if (!lineMatch) {
    lineMatch = cleanErrorStr.match(/line\s+(\d+)/i)
  }

  // Tentar extrair de objetos de erro do Python diretamente
  if (!lineMatch && error && typeof error === 'object') {
    try {
      // Pyodide pode expor atributos do erro Python diretamente
      const errorObj = error as any

      // Tentar diferentes propriedades comuns
      if (errorObj.lineno !== undefined && typeof errorObj.lineno === 'number' && errorObj.lineno > 0) {
        lineMatch = [`line ${errorObj.lineno}`, String(errorObj.lineno)]
      } else if (errorObj.line !== undefined && typeof errorObj.line === 'number' && errorObj.line > 0) {
        lineMatch = [`line ${errorObj.line}`, String(errorObj.line)]
      } else if (errorObj.linenumber !== undefined && typeof errorObj.linenumber === 'number' && errorObj.linenumber > 0) {
        lineMatch = [`line ${errorObj.linenumber}`, String(errorObj.linenumber)]
      }

      // Tentar acessar via __traceback__ se disponível
      if (!lineMatch && errorObj.__traceback__) {
        try {
          const tb = errorObj.__traceback__
          if (tb.tb_lineno !== undefined && typeof tb.tb_lineno === 'number' && tb.tb_lineno > 0) {
            lineMatch = [`line ${tb.tb_lineno}`, String(tb.tb_lineno)]
          }
        } catch {
          // Ignorar erros ao acessar traceback
        }
      }
    } catch {
      // Ignorar erros ao acessar propriedades
    }
  }

  // Debug: log para ajudar a identificar problemas
  if (!lineMatch) {
    console.debug('⚠️ Não foi possível extrair linha do erro:', {
      errorStr: cleanErrorStr.substring(0, 500),
      errorType: typeof error,
      errorKeys: error && typeof error === 'object' ? Object.keys(error) : null,
      fullError: error
    })
  } else {
    console.debug('✅ Linha extraída do erro:', {
      lineNum: parseInt(lineMatch[1], 10),
      match: lineMatch[0],
      hasMapping: lineMapping !== undefined && lineMapping !== null && lineMapping.size > 0
    })
  }

  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1], 10)
    console.debug('🔍 Tentando mapear linha do erro:', {
      lineNum,
      hasMapping: lineMapping !== undefined && lineMapping !== null && lineMapping.size > 0,
      mappingSize: lineMapping?.size || 0,
      mappingEntries: lineMapping ? Array.from(lineMapping.entries()) : []
    })

    // Se temos um mapeamento de linhas (para código transformado), usar
    if (lineMapping && lineMapping.size > 0) {
      const mappedLine = lineMapping.get(lineNum)
      if (mappedLine !== undefined) {
        errorLine = mappedLine
        console.debug('✅ Linha mapeada diretamente:', { lineNum, mappedLine })
      } else {
        console.debug('⚠️ Linha não encontrada no mapeamento direto, tentando linha mais próxima...')
        // Tentar encontrar a linha mais próxima (dentro de 5 linhas)
        let closestLine: number | null = null
        let minDiff = Infinity

        for (const [transformedLine, originalLine] of lineMapping.entries()) {
          const diff = Math.abs(transformedLine - lineNum)
          if (diff < minDiff) {
            minDiff = diff
            closestLine = originalLine
          }
        }

        // Usar linha mais próxima se a diferença for pequena (≤5 linhas)
        if (closestLine !== null && minDiff <= 5) {
          errorLine = closestLine
          console.debug('✅ Linha encontrada via linha mais próxima:', { lineNum, closestLine, minDiff })
        } else {
          console.debug('⚠️ Linha mais próxima muito distante, tentando cálculo direto...', { lineNum, closestLine, minDiff })
          // Fallback: calcular baseado na estrutura do código
          const codeLines = originalCode.split('\n')
          const importsCount = codeLines.filter(line => {
            const trimmed = line.trim()
            return trimmed.startsWith('import ') || trimmed.startsWith('from ')
          }).length

          // Calcular offset baseado na estrutura do código transformado
          // Estrutura: imports (se houver) + linha vazia (se houver imports) + def _run_code() + código indentado
          const baseOffset = importsCount > 0 ? importsCount + 2 : 1 // +1 para "async def _run_code():"

          if (lineNum > baseOffset) {
            // A linha do erro está dentro do código dentro de _run_code
            const codeLineIndex = lineNum - baseOffset - 1 // -1 porque a primeira linha dentro de _run_code é baseOffset + 1

            // Mapear codeLineIndex para linha original
            // Contar todas as linhas (incluindo vazias), mas pular imports
            let codeLineCounter = 0
            let originalLineCounter = 1

            for (let i = 0; i < codeLines.length; i++) {
              const line = codeLines[i]
              const trimmed = line.trim()

              // Pular apenas imports
              if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
                originalLineCounter++
                continue
              }

              // Esta é uma linha de código (pode ser vazia, comentário, etc.)
              if (codeLineCounter === codeLineIndex) {
                errorLine = originalLineCounter
                break
              }

              codeLineCounter++
              originalLineCounter++
            }
          }

          // Se ainda não encontrou, tentar usar a linha diretamente (último recurso)
          if (!errorLine && lineNum > 0) {
            const codeLines = originalCode.split('\n')
            const importsCount = codeLines.filter(line => {
              const trimmed = line.trim()
              return trimmed.startsWith('import ') || trimmed.startsWith('from ')
            }).length

            // Calcular offset baseado na estrutura do código transformado
            // Estrutura: imports (se houver) + linha vazia (se houver imports) + def _run_code() + código indentado
            const baseOffset = importsCount > 0 ? importsCount + 2 : 1

            // Se a linha do erro está dentro do código dentro de _run_code
            if (lineNum > baseOffset) {
              const codeLineIndex = lineNum - baseOffset - 1

              // Mapear diretamente: codeLineIndex -> linha original
              // Contar todas as linhas (incluindo vazias), mas pular imports
              let codeLineCounter = 0
              let originalLineCounter = 1

              for (let i = 0; i < codeLines.length; i++) {
                const line = codeLines[i]
                const trimmed = line.trim()

                // Pular apenas imports
                if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
                  originalLineCounter++
                  continue
                }

                // Esta é uma linha de código
                if (codeLineCounter === codeLineIndex) {
                  errorLine = originalLineCounter
                  console.debug('✅ Linha encontrada via fallback direto:', { codeLineIndex, originalLineCounter })
                  break
                }

                codeLineCounter++
                originalLineCounter++
              }
            }

            // Último recurso: usar a linha diretamente se estiver no range
            if (!errorLine && lineNum > 0 && lineNum <= codeLines.length) {
              errorLine = lineNum
              console.debug('⚠️ Usando linha diretamente como último recurso:', lineNum)
            }
          }
        }
      }
    } else {
      // Sem mapeamento, tentar calcular baseado na estrutura
      const codeLines = originalCode.split('\n')
      const importsCount = codeLines.filter(line => {
        const trimmed = line.trim()
        return trimmed.startsWith('import ') || trimmed.startsWith('from ')
      }).length

      // Se a linha está dentro de um range razoável, ajustar
      if (lineNum > importsCount && lineNum <= codeLines.length + importsCount) {
        errorLine = lineNum - importsCount
        if (errorLine < 1) errorLine = 1
        if (errorLine > codeLines.length) errorLine = codeLines.length
      } else if (lineNum > 0 && lineNum <= codeLines.length) {
        // Usar diretamente se estiver no range
        errorLine = lineNum
      }
    }
  }

  // 3. Extrair mensagem de erro detalhada
  // Para SyntaxError, formato especial
  if (isSyntaxError) {
    const syntaxMatch = cleanErrorStr.match(/SyntaxError:\s*(.+?)(?:\n|$)/i) ||
      cleanErrorStr.match(/IndentationError:\s*(.+?)(?:\n|$)/i) ||
      cleanErrorStr.match(/TabError:\s*(.+?)(?:\n|$)/i)
    if (syntaxMatch) {
      errorDetails = syntaxMatch[1].trim()
    } else {
      // Tentar extrair de outra forma
      const typeIndex = cleanErrorStr.indexOf(errorType)
      if (typeIndex !== -1) {
        const afterType = cleanErrorStr.substring(typeIndex + errorType.length).trim()
        if (afterType.startsWith(':')) {
          errorDetails = afterType.substring(1).trim().split('\n')[0]
        } else {
          errorDetails = 'syntax error'
        }
      }
    }
  } else {
    // Para outros erros, procurar padrão: TipoError: mensagem
    const errorTypeMatch = cleanErrorStr.match(new RegExp(`${errorType}:\\s*(.+?)(?:\\n|$)`, 'i'))
    if (errorTypeMatch) {
      errorDetails = errorTypeMatch[1].trim()
    } else {
      // Tentar extrair da última linha do traceback
      const lines = cleanErrorStr.split('\n').filter(line => line.trim())
      const lastLine = lines[lines.length - 1] || ''

      if (lastLine.includes(':')) {
        const parts = lastLine.split(':')
        if (parts.length > 1) {
          errorDetails = parts.slice(1).join(':').trim()
        }
      }

      // Se ainda não encontrou, usar mensagem original (limitada)
      if (!errorDetails || errorDetails === errorMessage) {
        errorDetails = errorMessage.split('\n')[0].trim().substring(0, 200)
      }
    }
  }

  // 4. Formatar traceback no estilo Python
  const codeLines = originalCode.split('\n')
  let formattedTraceback = ''

  // Adicionar saída capturada se houver (será adicionada antes do traceback)
  formattedTraceback += 'Traceback (most recent call last):\n'

  // Determinar linha do erro para exibição
  let displayLine = errorLine
  if (!displayLine && lineMatch) {
    displayLine = parseInt(lineMatch[1], 10)
  }

  if (displayLine && displayLine > 0 && displayLine <= codeLines.length) {
    const errorCodeLine = codeLines[displayLine - 1]
    formattedTraceback += `  File "${fileName}", line ${displayLine}, in <module>\n`

    if (errorCodeLine !== undefined && errorCodeLine.trim().length > 0) {
      // Mostrar a linha do código (preservar indentação relativa)
      const trimmedLine = errorCodeLine.trimStart()
      formattedTraceback += `    ${trimmedLine}\n`
    }
  } else {
    formattedTraceback += `  File "${fileName}", line ?, in <module>\n`
  }

  // Adicionar tipo de erro e mensagem
  formattedTraceback += `${errorType}: ${errorDetails}\n`

  return {
    type: errorType,
    line: errorLine,
    message: errorDetails,
    formattedTraceback,
    isSyntaxError,
  }
}

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
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const outputBufferRef = useRef<string[]>([])
  const executionAbortedRef = useRef(false)
  const lineMappingRef = useRef<Map<number, number>>(new Map()) // Mapeia linha transformada -> linha original

  // Estados para controle de input inline no terminal
  const [isWaitingInput, setIsWaitingInput] = useState(false)
  const [inputPrompt, setInputPrompt] = useState('')
  const inputResolveRef = useRef<((value: string) => void) | null>(null)
  const inputRejectRef = useRef<((error: any) => void) | null>(null)

  const { pyodide, loading, error } = usePyodide()
  const { layout, changeLayout, isMounted } = useLayout()
  const { isZenMode, toggleZenMode, isMounted: isZenMounted } = useZenMode()

  // Validação em tempo real de sintaxe
  const { errorLine, setErrorLine } = useSyntaxValidation({
    pyodide,
    loading,
    isExecuting,
    code: activeTab.code,
    fileName: activeTab.name,
    debounceMs: 800,
  })

  // Referência para o input de arquivo (oculto)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado para Command Palette
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  // Estado para notificação de compartilhamento
  const [shareNotification, setShareNotification] = useState<string | null>(null)

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



  const stopExecution = useCallback(() => {
    executionAbortedRef.current = true
    setIsExecuting(false)
    setIsWaitingInput(false)
    setInputPrompt('')

    // Rejeitar qualquer input pendente com KeyboardInterrupt para parar a execução
    if (inputRejectRef.current && pyodide) {
      try {
        // Criar uma exceção Python KeyboardInterrupt válida usando toPy
        // Isso fará com que o código Python pare imediatamente
        const KeyboardInterruptClass = pyodide.runPython('KeyboardInterrupt')
        // Usar toPy para converter a exceção JavaScript para Python
        const exception = pyodide.runPython(`
          import builtins
          builtins.KeyboardInterrupt("Execução interrompida pelo usuário")
        `)
        inputRejectRef.current(exception)
      } catch (e) {
        // Se não conseguir criar KeyboardInterrupt, usar uma exceção genérica
        try {
          const exception = pyodide.runPython(`
            Exception("Execução interrompida pelo usuário")
          `)
          inputRejectRef.current(exception)
        } catch (e2) {
          // Fallback: usar uma exceção JavaScript que será convertida
          // Mas primeiro tentar criar uma exceção Python simples
          try {
            const exception = pyodide.runPython('RuntimeError("Execução interrompida")')
            inputRejectRef.current(exception)
          } catch (e3) {
            // Último recurso: usar Error JavaScript
            inputRejectRef.current(new Error('Execução interrompida pelo usuário'))
          }
        }
      }
      inputRejectRef.current = null
    }
    inputResolveRef.current = null

    // Limpar handlers de stdout/stderr
    if (pyodide) {
      try {
        pyodide.setStdout({ batched: () => { } })
        pyodide.setStderr({ batched: () => { } })
      } catch (e) {
        console.error('Erro ao limpar handlers:', e)
      }
    }

    // Adicionar mensagem de cancelamento à saída
    const currentOutput = activeTab.output
    const cancelMessage = '\n\n⚠️ Execução interrompida pelo usuário'
    updateTabOutput(activeTabId, currentOutput + cancelMessage, false)
  }, [pyodide, activeTabId, activeTab.output])

  const executeCode = async () => {
    if (!pyodide || loading || isExecuting) return

    executionAbortedRef.current = false
    setIsExecuting(true)
    setErrorLine(null)
    updateTabOutput(activeTabId, '', false)
    outputBufferRef.current = []

    try {
      // Configurar captura de stdout e stderr usando batched
      // Usar handlers estáveis para evitar problemas de I/O
      const stdoutHandler = (text: string) => {
        try {
          if (text && typeof text === 'string') {
            outputBufferRef.current.push(text)

            // Atualizar a saída em tempo real
            const currentOutput = outputBufferRef.current.join('')
            updateTabOutput(activeTabId, currentOutput, false)
          }
        } catch (e) {
          console.error('Erro no stdout handler:', e)
        }
      }

      const stderrHandler = (text: string) => {
        try {
          if (text && typeof text === 'string') {
            // Ignorar KeyboardInterrupt causado por cancelamento do usuário
            if (executionAbortedRef.current && text.includes('KeyboardInterrupt') && text.includes('Execução interrompida pelo usuário')) {
              return
            }
            outputBufferRef.current.push(text)
            // Atualizar a saída em tempo real também para erros
            const currentOutput = outputBufferRef.current.join('')
            updateTabOutput(activeTabId, currentOutput, true)
          }
        } catch (e) {
          console.error('Erro no stderr handler:', e)
        }
      }

      // Handlers de stdout e stderr configurados diretamente no Python via globals
      // Não precisamos mais usar pyodide.setStdout/setStderr pois redirecionamos sys.stdout/sys.stderr

      // Substituir input() do Python por um sistema que usa input inline no terminal
      // Função que será chamada pelo Python quando input() for executado
      const requestInput = (prompt: string) => {
        return new Promise<string>((resolve, reject) => {
          // Verificar se a execução foi cancelada
          if (executionAbortedRef.current) {
            // Se foi cancelado, lançar KeyboardInterrupt para parar a execução
            try {
              const exception = pyodide.runPython(`
                import builtins
                builtins.KeyboardInterrupt("Execução interrompida pelo usuário")
              `)
              reject(exception)
            } catch (e) {
              // Fallback: usar exceção genérica
              try {
                const exception = pyodide.runPython(`
                  Exception("Execução interrompida pelo usuário")
                `)
                reject(exception)
              } catch (e2) {
                // Último recurso: usar Error JavaScript
                reject(new Error('Execução interrompida pelo usuário'))
              }
            }
            return
          }

          // IMPORTANTE: Atualizar a saída antes de solicitar input
          // Isso garante que todos os print() anteriores sejam exibidos
          const currentOutput = outputBufferRef.current.join('')
          if (currentOutput) {
            updateTabOutput(activeTabId, currentOutput, false)
          }

          inputResolveRef.current = resolve
          inputRejectRef.current = reject
          setInputPrompt(String(prompt) || '')
          setIsWaitingInput(true)
        })
      }

      // Expor funções diretamente no globals do Pyodide para comunicação
      pyodide.globals.set('__js_request_input', requestInput)

      // Função para saída que será chamada diretamente pelo Python
      // Isso evita o buffer interno do Pyodide e garante que cada print() com \n seja processado corretamente
      const jsStdout = (text: string) => {
        stdoutHandler(text)
      }
      pyodide.globals.set('__js_stdout', jsStdout)

      const jsStderr = (text: string) => {
        stderrHandler(text)
      }
      pyodide.globals.set('__js_stderr', jsStderr)

      // Substituir input() do Python para usar await diretamente
      // E configurar sys.stdout e sys.stderr para usar nossas funções JS
      pyodide.runPython(`
import builtins
import sys
import io

_original_input = builtins.input

# Obter as funções do globals
__js_request_input = globals()['__js_request_input']
__js_stdout = globals()['__js_stdout']
__js_stderr = globals()['__js_stderr']

# Classe personalizada para redirecionar stdout/stderr
class JSStream(io.TextIOBase):
    def __init__(self, js_writer):
        self.js_writer = js_writer
    
    def write(self, s):
        self.js_writer(s)
        return len(s)
    
    def flush(self):
        pass

# Substituir stdout e stderr
sys.stdout = JSStream(__js_stdout)
sys.stderr = JSStream(__js_stderr)

async def input(prompt=''):
    prompt_str = str(prompt) if prompt else ''
    # Forçar flush antes do input
    sys.stdout.flush()
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

      // Função auxiliar para encontrar o fechamento correto de input()
      const findInputClosing = (code: string, startPos: number): number => {
        let depth = 1
        let i = startPos + 6 // "input(" tem 6 caracteres
        let inString = false
        let stringChar = ''

        while (i < code.length && depth > 0) {
          const char = code[i]
          const prevChar = i > 0 ? code[i - 1] : ''

          // Detectar strings (simples ou duplas), ignorando escapes
          if ((char === '"' || char === "'") && prevChar !== '\\') {
            if (!inString) {
              inString = true
              stringChar = char
            } else if (char === stringChar) {
              inString = false
              stringChar = ''
            }
          }

          if (!inString) {
            if (char === '(') depth++
            if (char === ')') depth--
          }

          i++
        }

        return depth === 0 ? i - 1 : -1
      }

      // Primeiro, substituir input() com métodos encadeados: input(...).strip(), input(...).lower(), etc
      // Processar de trás para frente para não afetar os índices
      let searchPos = transformedCode.length
      while (true) {
        const lastInputPos = transformedCode.lastIndexOf('input(', searchPos)
        if (lastInputPos === -1) break

        const closingPos = findInputClosing(transformedCode, lastInputPos)
        if (closingPos !== -1) {
          // Verificar se há um método encadeado depois
          const afterInput = transformedCode.substring(closingPos + 1).trim()
          if (afterInput.startsWith('.')) {
            // Envolver input(...) em (await ...)
            const beforeInput = transformedCode.substring(0, lastInputPos)
            const inputCall = transformedCode.substring(lastInputPos, closingPos + 1)
            const afterInputCall = transformedCode.substring(closingPos + 1)
            transformedCode = beforeInput + '(await ' + inputCall + ')' + afterInputCall
          }
        }

        searchPos = lastInputPos - 1
        if (searchPos < 0) break
      }

      // Substituir input() de forma robusta
      // Processa de trás para frente para não afetar os índices
      let inputCounter = 0
      const inputReplacements: Array<{ original: string; replacement: string; position: number }> = []

      searchPos = transformedCode.length
      while (true) {
        const lastInputPos = transformedCode.lastIndexOf('input(', searchPos)
        if (lastInputPos === -1) break

        const closingPos = findInputClosing(transformedCode, lastInputPos)
        if (closingPos === -1) {
          searchPos = lastInputPos - 1
          if (searchPos < 0) break
          continue
        }

        // Extrair a chamada input(...)
        const inputCall = transformedCode.substring(lastInputPos, closingPos + 1)
        const beforeInput = transformedCode.substring(0, lastInputPos)
        const afterInput = transformedCode.substring(closingPos + 1)

        // Verificar se está dentro de uma chamada de função como int(), float(), str()
        // Padrão: função(input(...))
        const funcMatch = beforeInput.match(/(\w+)\s*\(\s*$/)
        const closingParenMatch = afterInput.match(/^\s*\)/)

        if (funcMatch && closingParenMatch) {
          // Está dentro de uma função, precisa extrair para variável temporária
          const funcName = funcMatch[1]

          // Encontrar início da chamada da função externa
          const funcCallStart = beforeInput.lastIndexOf(funcName + '(', lastInputPos)
          if (funcCallStart !== -1) {
            // Encontrar o fechamento completo da função externa
            let funcDepth = 1
            let funcPos = funcCallStart + funcName.length + 1
            let funcInString = false
            let funcStringChar = ''

            while (funcPos < transformedCode.length && funcDepth > 0) {
              const char = transformedCode[funcPos]
              const prevChar = funcPos > 0 ? transformedCode[funcPos - 1] : ''

              if ((char === '"' || char === "'") && prevChar !== '\\') {
                if (!funcInString) {
                  funcInString = true
                  funcStringChar = char
                } else if (char === funcStringChar) {
                  funcInString = false
                  funcStringChar = ''
                }
              }

              if (!funcInString) {
                if (char === '(') funcDepth++
                if (char === ')') funcDepth--
              }

              funcPos++
            }

            if (funcDepth === 0) {
              const funcCallEnd = funcPos - 1

              // Encontrar início da linha para obter indentação
              let lineStart = beforeInput.lastIndexOf('\n', funcCallStart)
              if (lineStart === -1) lineStart = 0
              else lineStart += 1

              const lineBeforeFunc = beforeInput.substring(lineStart, funcCallStart)
              const indentMatch = lineBeforeFunc.match(/^(\s*)/)
              const indent = indentMatch ? indentMatch[1] : ''

              // Verificar se há atribuição antes (ex: variavel = int(input(...)))
              const assignmentMatch = lineBeforeFunc.match(/^(\s*)(\w+)\s*=\s*$/)

              if (assignmentMatch) {
                // Há atribuição, substituir a linha inteira
                const fullLine = transformedCode.substring(lineStart, funcCallEnd + 1)
                const varName = assignmentMatch[2]

                inputCounter++
                const tempVar = `__input_temp_${inputCounter}`

                // Extrair a parte após o = (a função com input)
                const afterEquals = fullLine.substring(fullLine.indexOf('=') + 1).trim()
                const replacement = `${indent}${tempVar} = await ${inputCall}\n${indent}${varName} = ${afterEquals.replace(inputCall, tempVar)}`

                inputReplacements.push({
                  original: fullLine,
                  replacement,
                  position: lineStart
                })
              } else {
                // Apenas função, substituir função(input(...))
                const fullFuncCall = transformedCode.substring(funcCallStart, funcCallEnd + 1)

                inputCounter++
                const tempVar = `__input_temp_${inputCounter}`

                const replacement = `${indent}${tempVar} = await ${inputCall}\n${indent}${fullFuncCall.replace(inputCall, tempVar)}`

                inputReplacements.push({
                  original: fullFuncCall,
                  replacement,
                  position: funcCallStart
                })
              }

              searchPos = lineStart - 1
              continue
            }
          }
        }

        // Caso simples: apenas adicionar await
        inputReplacements.push({
          original: inputCall,
          replacement: `await ${inputCall}`,
          position: lastInputPos
        })

        searchPos = lastInputPos - 1
        if (searchPos < 0) break
      }

      // Aplicar substituições de trás para frente
      inputReplacements.sort((a, b) => b.position - a.position)
      for (const replacement of inputReplacements) {
        const before = transformedCode.substring(0, replacement.position)
        const after = transformedCode.substring(replacement.position + replacement.original.length)
        transformedCode = before + replacement.replacement + after
      }

      // Construir o código final com imports no nível superior
      // Garantir que os imports sejam executados primeiro
      const importsCode = imports.length > 0 ? imports.join('\n') + '\n\n' : ''

      // Criar mapeamento de linhas: linha no código transformado -> linha no código original
      // IMPORTANTE: Mapear TODAS as linhas, incluindo vazias, comentários E IMPORTS

      // Primeiro, criar mapeamento para imports (executados no nível superior)
      // Estrutura do código transformado:
      // - Se há imports: imports (N linhas, começando na linha 1) + linha vazia + def + código
      // - Se não há imports: def + código
      let transformedLineNum = 1

      // Mapear linhas dos imports (se houver)
      const importLineToOriginalLine = new Map<number, number>()
      let originalLineNum = 1

      for (let i = 0; i < lines.length; i++) {
        const originalLine = lines[i]
        const trimmed = originalLine.trim()

        // Se é um import, mapear para a linha do código transformado
        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
          // Encontrar qual import é este (comparar com a lista de imports)
          const importIndex = imports.findIndex(imp => {
            // Comparar removendo espaços extras
            const normalizedImport = imp.trim()
            const normalizedOriginal = trimmed.split('#')[0].trim() // Remover comentários inline
            return normalizedImport === normalizedOriginal
          })

          if (importIndex !== -1) {
            // Mapear: linha do código transformado (onde está o import) -> linha original
            const importTransformedLine = importIndex + 1 // Imports começam na linha 1
            importLineToOriginalLine.set(importTransformedLine, originalLineNum)
            lineMappingRef.current.set(importTransformedLine, originalLineNum)
            console.log(`✅ Mapeando import na linha transformada ${importTransformedLine} -> linha original ${originalLineNum} (import: "${trimmed.substring(0, 50)}")`)
          }
          originalLineNum++
          continue
        }

        originalLineNum++
      }

      // Criar mapeamento para código dentro de _run_code
      const codeLineToOriginalLine = new Map<number, number>()
      originalLineNum = 1
      let codeLineCounter = 0

      for (let i = 0; i < lines.length; i++) {
        const originalLine = lines[i]
        const trimmed = originalLine.trim()

        // Pular apenas imports (já mapeados acima)
        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
          originalLineNum++
          continue
        }

        // Mapear TODAS as outras linhas (incluindo vazias, comentários, etc.)
        codeLineToOriginalLine.set(codeLineCounter, originalLineNum)
        codeLineCounter++
        originalLineNum++
      }

      console.log('codeLineToOriginalLine criado:', Array.from(codeLineToOriginalLine.entries()))
      console.log('importLineToOriginalLine criado:', Array.from(importLineToOriginalLine.entries()))

      // Calcular onde começa o código dentro de _run_code
      // Estrutura do código transformado:
      // - Se há imports: imports (N linhas) + linha vazia (1 linha) + def (1 linha) = N + 2
      // - Se não há imports: def (1 linha) = 1
      if (imports.length > 0) {
        transformedLineNum = imports.length + 1 // linha após último import
        transformedLineNum++ // linha vazia após imports
      } else {
        transformedLineNum = 1
      }
      transformedLineNum++ // linha do "async def _run_code():"

      console.log('Linha inicial do código dentro de _run_code:', transformedLineNum)
      console.log('codeLineToOriginalLine:', Array.from(codeLineToOriginalLine.entries()))

      // Mapear linhas do código dentro de _run_code
      const codeLinesArray = transformedCode.split('\n')
      const indentedCode = codeLinesArray.map((line, codeIndex) => {
        // Mapear esta linha transformada para a linha original
        // IMPORTANTE: Mapear ANTES de incrementar transformedLineNum
        const originalLine = codeLineToOriginalLine.get(codeIndex)
        if (originalLine !== undefined) {
          lineMappingRef.current.set(transformedLineNum, originalLine)
          console.log(`✅ Mapeando linha transformada ${transformedLineNum} -> linha original ${originalLine} (codeIndex: ${codeIndex}, linha: "${line.substring(0, 50)}")`)
        } else {
          console.warn(`⚠️ Não encontrou mapeamento para codeIndex ${codeIndex} (total codeLines: ${codeLinesArray.length}, total mapeamento: ${codeLineToOriginalLine.size})`)
          // Tentar usar o codeIndex + 1 como fallback (assumindo que codeIndex começa em 0)
          const fallbackLine = codeIndex + 1
          if (fallbackLine <= lines.length) {
            lineMappingRef.current.set(transformedLineNum, fallbackLine)
            console.log(`⚠️ Usando fallback: linha transformada ${transformedLineNum} -> linha original ${fallbackLine}`)
          }
        }

        // Incrementar após mapear (sempre, mesmo para linhas vazias)
        transformedLineNum++

        // Não indentar linhas vazias, mas ainda contar no mapeamento
        if (line.trim().length === 0) {
          return ''
        }

        return '    ' + line
      }).join('\n')

      console.log('Mapeamento final criado:', Array.from(lineMappingRef.current.entries()))

      const wrappedCode = `${importsCode}async def _run_code():\n${indentedCode}\n\n# Executar o código assíncrono\nawait _run_code()`

      // Debug: verificar se os imports estão sendo capturados
      console.log('=== DEBUG EXECUÇÃO ===')
      console.log('Imports detectados:', imports.length > 0 ? imports : 'Nenhum import detectado')
      console.log('Total de linhas do código original:', lines.length)
      console.log('Linhas de código (sem imports):', codeLines.length)
      console.log('Mapeamento de linhas criado:', Array.from(lineMappingRef.current.entries()))
      console.log('Primeiras 5 linhas do código original:', lines.slice(0, 5))
      console.log('Código final (primeiras 30 linhas):')
      console.log(wrappedCode.split('\n').slice(0, 30).join('\n'))
      console.log('======================')

      // Verificar se foi cancelado antes de executar
      if (executionAbortedRef.current) {
        updateTabOutput(activeTabId, '⚠️ Execução interrompida pelo usuário', false)
        return
      }

      const result = await pyodide.runPythonAsync(wrappedCode).catch(async (err) => {
        // Se a execução foi cancelada, não tratar como erro normal
        if (executionAbortedRef.current) {
          return null
        }
        // Verificar se é KeyboardInterrupt causado por cancelamento
        const errorStr = String(err)
        if (errorStr.includes('KeyboardInterrupt')) {
          // Se contém a mensagem de cancelamento ou se foi cancelado, não tratar como erro
          if (errorStr.includes('Execução interrompida pelo usuário') || executionAbortedRef.current) {
            return null
          }
        }

        // Tentar obter traceback completo do Pyodide se disponível
        try {
          // Pyodide pode ter um método para obter o traceback completo
          if (pyodide && typeof (pyodide as any).getException === 'function') {
            const fullTraceback = (pyodide as any).getException()
            if (fullTraceback) {
              // Criar um novo erro com traceback completo
              const enhancedError = new Error(String(err))
                ; (enhancedError as any).pyodideTraceback = fullTraceback
              throw enhancedError
            }
          }
        } catch {
          // Se falhar, continuar com o erro original
        }

        throw err
      })

      // Verificar se foi cancelado durante a execução
      if (executionAbortedRef.current) {
        const currentOutput = outputBufferRef.current.join('')
        const cancelMessage = currentOutput ? '\n\n⚠️ Execução interrompida pelo usuário' : '⚠️ Execução interrompida pelo usuário'
        updateTabOutput(activeTabId, currentOutput + cancelMessage, false)
        return
      }

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
      setErrorLine(null) // Limpar erro se a execução foi bem-sucedida
      updateTabOutput(activeTabId, finalOutput || 'Código executado com sucesso!', false)
    } catch (err) {
      // Verificar se é KeyboardInterrupt causado por cancelamento do usuário
      const errorStr = String(err)
      const isKeyboardInterrupt = errorStr.includes('KeyboardInterrupt')
      const isUserCancelled = errorStr.includes('Execução interrompida pelo usuário') || executionAbortedRef.current

      // Se foi cancelado pelo usuário, mostrar apenas mensagem de cancelamento
      if (isKeyboardInterrupt && isUserCancelled) {
        const currentOutput = outputBufferRef.current.join('')
        const cancelMessage = currentOutput ? '\n\n⚠️ Execução interrompida pelo usuário' : '⚠️ Execução interrompida pelo usuário'
        updateTabOutput(activeTabId, currentOutput + cancelMessage, false)
        setErrorLine(null)
        return
      }

      // Também verificar se foi cancelado (mesmo sem KeyboardInterrupt explícito)
      if (executionAbortedRef.current) {
        const currentOutput = outputBufferRef.current.join('')
        const cancelMessage = currentOutput ? '\n\n⚠️ Execução interrompida pelo usuário' : '⚠️ Execução interrompida pelo usuário'
        updateTabOutput(activeTabId, currentOutput + cancelMessage, false)
        setErrorLine(null)
        return
      }

      // Capturar qualquer saída que possa ter sido gerada antes do erro
      const capturedOutput = outputBufferRef.current.join('')

      // Debug: log do erro antes de parsear
      console.log('=== ERRO CAPTURADO ===')
      console.log('Erro:', err)
      console.log('String do erro:', String(err))
      console.log('Tipo do erro:', typeof err)
      if (err && typeof err === 'object') {
        console.log('Chaves do erro:', Object.keys(err))
        console.log('Erro completo:', JSON.stringify(err, null, 2))
      }
      console.log('Mapeamento disponível:', Array.from(lineMappingRef.current.entries()))
      console.log('=====================')

      // Usar a função utilitária para parsear o erro
      const parsedError = parsePyodideError(
        err,
        activeTab.code,
        activeTab.name,
        lineMappingRef.current
      )

      // Debug: log do resultado do parsing
      console.log('=== RESULTADO DO PARSING ===')
      console.log('Tipo:', parsedError.type)
      console.log('Linha:', parsedError.line)
      console.log('Mensagem:', parsedError.message)
      console.log('É erro de sintaxe:', parsedError.isSyntaxError)
      console.log('===========================')

      // Definir a linha do erro no editor
      setErrorLine(parsedError.line)

      // Formatar saída de erro completa
      let errorOutput = ''

      // Se houver saída capturada antes do erro, incluir
      if (capturedOutput.trim()) {
        errorOutput = capturedOutput + '\n'
      }

      // Adicionar traceback formatado
      errorOutput += parsedError.formattedTraceback

      // Adicionar mensagem de saída do processo
      errorOutput += '\n** Process exited - Return Code: 1 **\n'

      // Atualizar saída do terminal com o erro formatado
      updateTabOutput(activeTabId, errorOutput || 'Erro ao executar código', true)
    } finally {
      // Só limpar se não foi cancelado manualmente
      if (!executionAbortedRef.current) {
        setIsExecuting(false)
      }
      setIsWaitingInput(false)
      setInputPrompt('')
      inputResolveRef.current = null
      inputRejectRef.current = null
      // Não limpar o buffer aqui, pode conter informações úteis
    }
  }

  const [fontSize, setFontSize] = useState(14)

  useEffect(() => {
    // Carregar tamanho da fonte salvo
    const savedFontSize = localStorage.getItem('python-web-ide-font-size')
    if (savedFontSize) {
      const parsed = parseInt(savedFontSize)
      if (!isNaN(parsed) && parsed >= 10 && parsed <= 24) {
        setFontSize(parsed)
      }
    }
  }, [])

  const handleFontSizeChange = (newSize: number) => {
    setFontSize(newSize)
    localStorage.setItem('python-web-ide-font-size', String(newSize))
  }

  // Função para limpar terminal
  const clearTerminal = useCallback(() => {
    updateTabOutput(activeTabId, '', false)
  }, [activeTabId, updateTabOutput])

  // Função para formatar código (básico - indentação)
  const formatCode = useCallback(() => {
    // Formatação básica: remover espaços extras e normalizar indentação
    const lines = activeTab.code.split('\n')
    const formatted = lines
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // Remover múltiplas linhas vazias

    if (formatted !== activeTab.code) {
      updateTabCode(activeTabId, formatted)
    }
  }, [activeTab.code, activeTabId, updateTabCode])

  // Função para compartilhar código
  const shareCode = useCallback(async () => {
    try {
      const shareUrl = generateShareUrl(activeTab.code)
      
      // Tentar usar Web Share API se disponível
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Código Python',
            text: `Confira este código Python: ${activeTab.name}`,
            url: shareUrl,
          })
          return
        } catch (err) {
          // Se o usuário cancelar, continuar com fallback
          if ((err as Error).name !== 'AbortError') {
            console.error('Erro ao compartilhar:', err)
          }
        }
      }
      
      // Fallback: copiar para clipboard
      await navigator.clipboard.writeText(shareUrl)
      setShareNotification('URL copiada para a área de transferência!')
      setTimeout(() => setShareNotification(null), 3000)
    } catch (error) {
      console.error('Erro ao compartilhar código:', error)
      alert('Erro ao gerar URL de compartilhamento')
    }
  }, [activeTab.code, activeTab.name])

  // Detectar código na URL ao carregar
  useEffect(() => {
    const codeFromUrl = getCodeFromUrl()
    if (codeFromUrl && codeFromUrl.trim()) {
      // Atualizar a aba atual com o código compartilhado
      updateTabCode(activeTabId, codeFromUrl)
      // Limpar a URL para não recarregar o código ao recarregar a página
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, []) // Executar apenas uma vez ao montar

  // Função para alternar tema
  const toggleTheme = useCallback(() => {
    const isDark = document.documentElement.classList.contains('dark')
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }, [])

  // Comandos da Command Palette
  const commands: Command[] = [
    {
      id: 'toggle-theme',
      label: 'Alternar Tema',
      description: 'Alternar entre tema claro e escuro',
      keywords: ['tema', 'theme', 'dark', 'light', 'modo escuro'],
      action: toggleTheme,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      id: 'execute',
      label: 'Executar Código',
      description: 'Executar o código Python atual',
      keywords: ['executar', 'run', 'executar código'],
      action: executeCode,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'format',
      label: 'Formatar Código',
      description: 'Formatar e limpar o código atual',
      keywords: ['formatar', 'format', 'limpar', 'clean'],
      action: formatCode,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      id: 'clear-terminal',
      label: 'Limpar Terminal',
      description: 'Limpar a saída do terminal',
      keywords: ['limpar', 'clear', 'terminal', 'saída'],
      action: clearTerminal,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    {
      id: 'zen-mode',
      label: isZenMode ? 'Sair do Modo Zen' : 'Modo Zen',
      description: isZenMode ? 'Sair do modo foco' : 'Focar apenas no editor',
      keywords: ['zen', 'foco', 'focus', 'fullscreen', 'tela cheia'],
      action: toggleZenMode,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isZenMode ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          )}
        </svg>
      ),
    },
    {
      id: 'share',
      label: 'Compartilhar Código',
      description: 'Gerar URL para compartilhar o código atual',
      keywords: ['compartilhar', 'share', 'url', 'link', 'compartilhar código'],
      action: shareCode,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      ),
    },
  ]

  // Atalhos de teclado globais
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl + P ou Cmd + P: Abrir Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !e.shiftKey) {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
        return
      }

      // Ctrl + Enter ou F8: Executar código
      if (((e.ctrlKey || e.metaKey) && e.key === 'Enter') || e.key === 'F8') {
        e.preventDefault()
        executeCode()
        return
      }

      // F1: Abrir modal Sobre
      if (e.key === 'F1') {
        e.preventDefault()
        setIsAboutModalOpen(true)
        return
      }

      // F9: Atalho alternativo para parar execução (opcional, mas útil)
      if (e.key === 'F9' && isExecuting) {
        e.preventDefault()
        stopExecution()
        return
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [executeCode, isExecuting, stopExecution, isCommandPaletteOpen])

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors ${isZenMode ? 'zen-mode' : ''}`}>
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />
      {/* Notificação de compartilhamento */}
      {shareNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 dark:bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{shareNotification}</span>
        </div>
      )}
      {/* Header */}
      {(!isZenMode || !isZenMounted) && (
        <header className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
              {/* Logo e Título */}
              <div className="flex items-center gap-2 sm:gap-3 group min-w-0">
                <div className="relative flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Interpretador Python Web - Execute código Python no navegador"
                    className="h-8 sm:h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-110"
                    width={36}
                    height={36}
                  />
                  <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                Interpretador Python Web
              </h1>
                  <span className="text-xs text-gray-500 dark:text-gray-400 hidden lg:inline">
                    Execute código Python no navegador
                  </span>
            </div>
              </div>

              {/* Controles */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Grupo: Layout e Modo Zen */}
                <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
              {isMounted && <LayoutSelector currentLayout={layout} onLayoutChange={changeLayout} />}
                  <div className="w-px h-5 sm:h-6 bg-gray-300 dark:bg-gray-700" />
                  <button
                    onClick={toggleZenMode}
                    className={`relative p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 rounded-md transition-all duration-200 ${
                      isZenMode
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title={isZenMode ? 'Sair do Modo Zen (Foco)' : 'Modo Zen - Focar apenas no editor'}
                    aria-label={isZenMode ? 'Sair do Modo Zen' : 'Modo Zen'}
                  >
                    {isZenMode ? (
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    )}
                    {isZenMode && (
                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </button>
                </div>

                {/* Modo Zen isolado em mobile */}
                <button
                  onClick={toggleZenMode}
                  className={`sm:hidden relative p-2 text-gray-600 dark:text-gray-400 rounded-lg transition-all duration-200 ${
                    isZenMode
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title={isZenMode ? 'Sair do Modo Zen' : 'Modo Zen'}
                  aria-label={isZenMode ? 'Sair do Modo Zen' : 'Modo Zen'}
                >
                  {isZenMode ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>

                {/* Separador */}
                <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-gray-700 mx-0.5" />

                {/* Grupo: Informações e Tema */}
                <div className="flex items-center gap-0.5 sm:gap-1">
              <button
                onClick={() => setIsAboutModalOpen(true)}
                    className="relative p-2 sm:p-2.5 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200 group"
                    title="Sobre o Interpretador Python Web (F1)"
                aria-label="Sobre"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden sm:block">
                      F1
                    </span>
              </button>
              <ThemeToggle />
                </div>
            </div>
          </div>
        </div>
      </header>
      )}

      {/* Main Content */}
      <main className={`${isZenMode ? 'max-w-full mx-0 px-0 py-0' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'}`}>
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
          <div className={`space-y-4 ${isZenMode ? 'h-screen flex flex-col' : ''}`}>
            {/* Execute and Stop Buttons */}
            {!isZenMode && (
            <div className="flex justify-center items-center gap-3">
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

              {isExecuting && (
                <button
                  onClick={stopExecution}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                  title="Parar execução"
                  aria-label="Parar execução do código"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                  </svg>
                  <span>Parar</span>
                </button>
              )}
            </div>
            )}

            {/* Layout dinâmico baseado na escolha do usuário com painéis redimensionáveis */}
            {isMounted && (
              <div className={isZenMode ? 'flex-1 h-full' : 'w-full'}>
                {isZenMode ? (
                  // Modo Zen: apenas o editor em tela cheia
                  <div className="h-full flex flex-col bg-white dark:bg-gray-900 relative">
                    <EditorTabs
                      tabs={tabs}
                      activeTabId={activeTabId}
                      onTabClick={setActiveTabId}
                      onTabClose={closeTab}
                      onNewTab={createNewTab}
                      onImport={importCode}
                      onExportCurrent={exportCurrentTab}
                      onExportAll={exportAllTabs}
                      onShare={shareCode}
                      fontSize={fontSize}
                      onFontSizeChange={handleFontSizeChange}
                    />
                    <div className="flex-1 h-full">
                      <PythonEditor
                        code={activeTab.code}
                        onChange={(newCode) => {
                          updateTabCode(activeTabId, newCode)
                          setErrorLine(null)
                        }}
                        disabled={loading || isExecuting}
                        fileName={activeTab.name}
                        errorLine={errorLine}
                        onRun={executeCode}
                        fontSize={fontSize}
                      />
                    </div>
                    {/* Zen Mode Overlay */}
                    <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 z-50">
                      <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur px-2 py-1 rounded shadow-sm">
                        Mais opções (Ctrl + P)
                      </div>
                       <button
                         onClick={toggleZenMode}
                         className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-105"
                       >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                         </svg>
                         <span>Sair do Modo Zen</span>
                       </button>
                    </div>
                  </div>
                ) : (
                  // Layout normal com painéis redimensionáveis
                  <Group
                    orientation={layout === 'bottom' || layout === 'top' ? 'vertical' : 'horizontal'}
                    className="h-[calc(100vh-12rem)] min-h-[600px] w-full"
                  >
                    {(layout === 'top' || layout === 'left') && (
                      <>
                        <Panel defaultSize={50} minSize={20} className="flex flex-col">
                          <div className="h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
                            <div className="h-[300px] sm:h-[400px] lg:h-full">
                              <OutputTerminal
                                output={activeTab.output}
                                isError={activeTab.hasError}
                                isLoading={loading}
                                isWaitingInput={isWaitingInput}
                                inputPrompt={inputPrompt}
                                onInputSubmit={(value) => {
                                  const promptText = inputPrompt || ''
                                  const inputLine = promptText + value + '\n'
                                  const currentOutput = activeTab.output
                                  const newOutput = currentOutput + inputLine
                                  updateTabOutput(activeTabId, newOutput, false)
                                  outputBufferRef.current.push(inputLine)
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
                        </Panel>
                        <Separator className="bg-transparent hover:bg-blue-400/20 dark:hover:bg-blue-600/20 transition-colors cursor-col-resize relative group">
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-0.5 h-full bg-gray-300 dark:bg-gray-700 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors" />
                          </div>
                        </Separator>
                      </>
                    )}
                    <Panel defaultSize={50} minSize={20} className="flex flex-col">
                      <div className="h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
                  <EditorTabs
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabClick={setActiveTabId}
                    onTabClose={closeTab}
                    onNewTab={createNewTab}
                    onImport={importCode}
                    onExportCurrent={exportCurrentTab}
                    onExportAll={exportAllTabs}
                          onShare={shareCode}
                    fontSize={fontSize}
                    onFontSizeChange={handleFontSizeChange}
                  />
                        <div className="flex-1 h-full">
                    <PythonEditor
                      code={activeTab.code}
                      onChange={(newCode) => {
                        updateTabCode(activeTabId, newCode)
                              setErrorLine(null)
                      }}
                      disabled={loading || isExecuting}
                      fileName={activeTab.name}
                      errorLine={errorLine}
                      onRun={executeCode}
                      fontSize={fontSize}
                    />
                  </div>
                </div>
                    </Panel>
                    {(layout === 'bottom' || layout === 'right') && (
                      <>
                        <Separator className="bg-transparent hover:bg-blue-400/20 dark:hover:bg-blue-600/20 transition-colors cursor-row-resize relative group">
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="h-0.5 w-full bg-gray-300 dark:bg-gray-700 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors" />
                          </div>
                        </Separator>
                        <Panel defaultSize={50} minSize={20} className="flex flex-col">
                          <div className="h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
                            <div className="h-[300px] sm:h-[400px] lg:h-full">
                    <OutputTerminal
                      output={activeTab.output}
                      isError={activeTab.hasError}
                      isLoading={loading}
                      isWaitingInput={isWaitingInput}
                      inputPrompt={inputPrompt}
                      onInputSubmit={(value) => {
                        const promptText = inputPrompt || ''
                        const inputLine = promptText + value + '\n'
                        const currentOutput = activeTab.output
                        const newOutput = currentOutput + inputLine
                        updateTabOutput(activeTabId, newOutput, false)
                        outputBufferRef.current.push(inputLine)
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
                        </Panel>
                      </>
                    )}
                  </Group>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      {!isZenMode && (
      <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
            {/* Informações do desenvolvedor */}
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <p>
                © {new Date().getFullYear()} Desenvolvido por{' '}
                <a
                  href="https://luistls.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Luis Teixeira
                </a>
              </p>
              <span className="hidden md:inline">•</span>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/LuisT-ls/interpreta-python"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  title="Ver no GitHub"
                  aria-label="GitHub do projeto"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/in/luis-tei"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  title="Ver no LinkedIn"
                  aria-label="LinkedIn do desenvolvedor"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Powered by */}
            <div className="flex items-center gap-2">
              <span>Powered by</span>
              <a
                href="https://pyodide.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Pyodide
              </a>
              <span>e</span>
              <a
                href="https://nextjs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Next.js
              </a>
            </div>
          </div>
        </div>
      </footer>
      )}

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

