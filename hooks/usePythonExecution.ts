'use client'

import { useState, useRef, useCallback } from 'react'
import { parsePyodideError } from '@/utils/parsePyodideError'
import { logger } from '@/utils/logger'

interface UsePythonExecutionOptions {
  pyodide: any
  loading: boolean
  code: string
  fileName: string
  activeTabId: string
  currentOutput: string
  updateTabOutput: (tabId: string, output: string, hasError: boolean) => void
  setErrorLine: (line: number | null) => void
  addTabPlot?: (tabId: string, plot: { id: string; imageData: string; width: number; height: number; timestamp: number }) => void
  clearTabPlots?: (tabId: string) => void
}

/**
 * Hook para gerenciar a execução de código Python
 * Inclui execução, parada, captura de stdout/stderr e suporte a input()
 */
export function usePythonExecution({
  pyodide,
  loading,
  code,
  fileName,
  activeTabId,
  currentOutput,
  updateTabOutput,
  setErrorLine,
  addTabPlot,
  clearTabPlots,
}: UsePythonExecutionOptions) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [isWaitingInput, setIsWaitingInput] = useState(false)
  const [inputPrompt, setInputPrompt] = useState('')

  const outputBufferRef = useRef<string[]>([])
  const executionAbortedRef = useRef(false)
  const lineMappingRef = useRef<Map<number, number>>(new Map())
  const inputResolveRef = useRef<((value: string) => void) | null>(null)
  const inputRejectRef = useRef<((error: any) => void) | null>(null)

  const stopExecution = useCallback(() => {
    executionAbortedRef.current = true
    setIsExecuting(false)
    setIsWaitingInput(false)
    setInputPrompt('')

    // Rejeitar qualquer input pendente com KeyboardInterrupt para parar a execução
    if (inputRejectRef.current && pyodide) {
      try {
        const exception = pyodide.runPython(`
          import builtins
          builtins.KeyboardInterrupt("Execução interrompida pelo usuário")
        `)
        inputRejectRef.current(exception)
      } catch (e) {
        try {
          const exception = pyodide.runPython(`
            Exception("Execução interrompida pelo usuário")
          `)
          inputRejectRef.current(exception)
        } catch (e2) {
          try {
            const exception = pyodide.runPython('RuntimeError("Execução interrompida")')
            inputRejectRef.current(exception)
          } catch (e3) {
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
        logger.error('Erro ao limpar handlers:', e)
      }
    }

    // Adicionar mensagem de cancelamento à saída
    const cancelMessage = '\n\n⚠️ Execução interrompida pelo usuário'
    updateTabOutput(activeTabId, currentOutput + cancelMessage, false)
  }, [pyodide, activeTabId, currentOutput, updateTabOutput, addTabPlot, clearTabPlots])

  const executeCode = useCallback(async () => {
    if (!pyodide || loading || isExecuting) return

    executionAbortedRef.current = false
    setIsExecuting(true)
    setErrorLine(null)
    updateTabOutput(activeTabId, '', false)
    outputBufferRef.current = []
    
    // Limpar plots anteriores
    if (clearTabPlots) {
      clearTabPlots(activeTabId)
    }

    try {
      // Configurar callback para capturar gráficos matplotlib
      if (addTabPlot) {
        // Criar função global para receber gráficos do Python
        (window as any).create_matplotlib_canvas = (
          plotId: string,
          imageData: string,
          width: number,
          height: number
        ) => {
          addTabPlot(activeTabId, {
            id: plotId,
            imageData,
            width,
            height,
            timestamp: Date.now(),
          })
        }

        // Inicializar contador de plots
        if (!(window as any).plot_id_counter) {
          (window as any).plot_id_counter = 0
        }

        // Configurar matplotlib se disponível
        try {
          // Tentar carregar e configurar matplotlib
          await pyodide.loadPackage('matplotlib')
          
          pyodide.runPython(`
import matplotlib
matplotlib.use('Agg')  # Backend não-interativo
import matplotlib.pyplot as plt
import io
import base64

# Criar função para capturar gráfico
def show_plot():
    """Captura o gráfico atual e retorna como canvas"""
    import js
    
    fig = plt.gcf()
    if fig is None or len(fig.axes) == 0:
        return None
    
    # Renderizar em buffer PNG
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    buf.seek(0)
    
    # Converter para base64
    img_data = base64.b64encode(buf.read()).decode('utf-8')
    
    # Criar ID único
    plot_id = f"plot_{js.plot_id_counter}"
    js.plot_id_counter += 1
    
    # Obter dimensões da figura
    width = int(fig.get_figwidth() * fig.dpi)
    height = int(fig.get_figheight() * fig.dpi)
    
    # Chamar callback JS para criar canvas
    js.create_matplotlib_canvas(plot_id, img_data, width, height)
    
    # Limpar figura
    plt.clf()
    plt.close(fig)
    
    return plot_id

# Substituir plt.show() para capturar gráficos
_original_show = plt.show
def custom_show(*args, **kwargs):
    result = show_plot()
    # Não chamar _original_show para evitar popup
    return result

plt.show = custom_show
          `)
        } catch (e) {
          // matplotlib pode não estar disponível, isso é ok
          logger.debug('Matplotlib não disponível ou erro ao configurar:', e)
        }
      }
      // Configurar captura de stdout e stderr
      const stdoutHandler = (text: string) => {
        try {
          if (text && typeof text === 'string') {
            outputBufferRef.current.push(text)
            const currentOutput = outputBufferRef.current.join('')
            updateTabOutput(activeTabId, currentOutput, false)
          }
        } catch (e) {
          logger.error('Erro no stdout handler:', e)
        }
      }

      const stderrHandler = (text: string) => {
        try {
          if (text && typeof text === 'string') {
            if (executionAbortedRef.current && text.includes('KeyboardInterrupt') && text.includes('Execução interrompida pelo usuário')) {
              return
            }
            outputBufferRef.current.push(text)
            const currentOutput = outputBufferRef.current.join('')
            updateTabOutput(activeTabId, currentOutput, true)
          }
        } catch (e) {
          logger.error('Erro no stderr handler:', e)
        }
      }

      // Substituir input() do Python por um sistema que usa input inline no terminal
      const requestInput = (prompt: string) => {
        return new Promise<string>((resolve, reject) => {
          if (executionAbortedRef.current) {
            try {
              const exception = pyodide.runPython(`
                import builtins
                builtins.KeyboardInterrupt("Execução interrompida pelo usuário")
              `)
              reject(exception)
            } catch (e) {
              try {
                const exception = pyodide.runPython(`
                  Exception("Execução interrompida pelo usuário")
                `)
                reject(exception)
              } catch (e2) {
                reject(new Error('Execução interrompida pelo usuário'))
              }
            }
            return
          }

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

      // Expor funções no globals do Pyodide
      pyodide.globals.set('__js_request_input', requestInput)

      const jsStdout = (text: string) => {
        stdoutHandler(text)
      }
      pyodide.globals.set('__js_stdout', jsStdout)

      const jsStderr = (text: string) => {
        stderrHandler(text)
      }
      pyodide.globals.set('__js_stderr', jsStderr)

      // Configurar sys.stdout, sys.stderr e input() no Python
      pyodide.runPython(`
import builtins
import sys
import io

_original_input = builtins.input

__js_request_input = globals()['__js_request_input']
__js_stdout = globals()['__js_stdout']
__js_stderr = globals()['__js_stderr']

class JSStream(io.TextIOBase):
    def __init__(self, js_writer):
        self.js_writer = js_writer
    
    def write(self, s):
        self.js_writer(s)
        return len(s)
    
    def flush(self):
        pass

sys.stdout = JSStream(__js_stdout)
sys.stderr = JSStream(__js_stderr)

async def input(prompt=''):
    prompt_str = str(prompt) if prompt else ''
    sys.stdout.flush()
    result = await __js_request_input(prompt_str)
    if result is None:
        raise EOFError("EOF when reading a line")
    return result

builtins.input = input
      `)

      // Separar imports do resto do código
      const lines = code.split('\n')
      const imports: string[] = []
      const codeLines: string[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        if (trimmed.length === 0 && imports.length === 0 && codeLines.length === 0) {
          continue
        }

        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
          const importLine = trimmed.split('#')[0].trim()
          if (importLine) {
            imports.push(importLine)
          }
        } else {
          codeLines.push(line)
        }
      }

      // Transformar o código para que input() funcione automaticamente
      let transformedCode = codeLines.join('\n')

      // Função auxiliar para encontrar o fechamento correto de input()
      const findInputClosing = (code: string, startPos: number): number => {
        let depth = 1
        let i = startPos + 6
        let inString = false
        let stringChar = ''

        while (i < code.length && depth > 0) {
          const char = code[i]
          const prevChar = i > 0 ? code[i - 1] : ''

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

      // Primeiro, substituir input() com métodos encadeados
      let searchPos = transformedCode.length
      while (true) {
        const lastInputPos = transformedCode.lastIndexOf('input(', searchPos)
        if (lastInputPos === -1) break

        const closingPos = findInputClosing(transformedCode, lastInputPos)
        if (closingPos !== -1) {
          const afterInput = transformedCode.substring(closingPos + 1).trim()
          if (afterInput.startsWith('.')) {
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

        const inputCall = transformedCode.substring(lastInputPos, closingPos + 1)
        const beforeInput = transformedCode.substring(0, lastInputPos)
        const afterInput = transformedCode.substring(closingPos + 1)

        const funcMatch = beforeInput.match(/(\w+)\s*\(\s*$/)
        const closingParenMatch = afterInput.match(/^\s*\)/)

        if (funcMatch && closingParenMatch) {
          const funcName = funcMatch[1]
          const funcCallStart = beforeInput.lastIndexOf(funcName + '(', lastInputPos)
          if (funcCallStart !== -1) {
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
              let lineStart = beforeInput.lastIndexOf('\n', funcCallStart)
              if (lineStart === -1) lineStart = 0
              else lineStart += 1

              const lineBeforeFunc = beforeInput.substring(lineStart, funcCallStart)
              const indentMatch = lineBeforeFunc.match(/^(\s*)/)
              const indent = indentMatch ? indentMatch[1] : ''

              const assignmentMatch = lineBeforeFunc.match(/^(\s*)(\w+)\s*=\s*$/)

              if (assignmentMatch) {
                const fullLine = transformedCode.substring(lineStart, funcCallEnd + 1)
                const varName = assignmentMatch[2]

                inputCounter++
                const tempVar = `__input_temp_${inputCounter}`

                const afterEquals = fullLine.substring(fullLine.indexOf('=') + 1).trim()
                const replacement = `${indent}${tempVar} = await ${inputCall}\n${indent}${varName} = ${afterEquals.replace(inputCall, tempVar)}`

                inputReplacements.push({
                  original: fullLine,
                  replacement,
                  position: lineStart
                })
              } else {
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

        inputReplacements.push({
          original: inputCall,
          replacement: `await ${inputCall}`,
          position: lastInputPos
        })

        searchPos = lastInputPos - 1
        if (searchPos < 0) break
      }

      // Aplicar substituições
      inputReplacements.sort((a, b) => b.position - a.position)
      for (const replacement of inputReplacements) {
        const before = transformedCode.substring(0, replacement.position)
        const after = transformedCode.substring(replacement.position + replacement.original.length)
        transformedCode = before + replacement.replacement + after
      }

      // Criar mapeamento de linhas
      const importsCode = imports.length > 0 ? imports.join('\n') + '\n\n' : ''
      let transformedLineNum = 1

      const importLineToOriginalLine = new Map<number, number>()
      let originalLineNum = 1

      for (let i = 0; i < lines.length; i++) {
        const originalLine = lines[i]
        const trimmed = originalLine.trim()

        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
          const importIndex = imports.findIndex(imp => {
            const normalizedImport = imp.trim()
            const normalizedOriginal = trimmed.split('#')[0].trim()
            return normalizedImport === normalizedOriginal
          })

          if (importIndex !== -1) {
            const importTransformedLine = importIndex + 1
            importLineToOriginalLine.set(importTransformedLine, originalLineNum)
            lineMappingRef.current.set(importTransformedLine, originalLineNum)
          }
          originalLineNum++
          continue
        }

        originalLineNum++
      }

      const codeLineToOriginalLine = new Map<number, number>()
      originalLineNum = 1
      let codeLineCounter = 0

      for (let i = 0; i < lines.length; i++) {
        const originalLine = lines[i]
        const trimmed = originalLine.trim()

        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
          originalLineNum++
          continue
        }

        codeLineToOriginalLine.set(codeLineCounter, originalLineNum)
        codeLineCounter++
        originalLineNum++
      }

      if (imports.length > 0) {
        transformedLineNum = imports.length + 1
        transformedLineNum++
      } else {
        transformedLineNum = 1
      }
      transformedLineNum++

      const codeLinesArray = transformedCode.split('\n')
      const indentedCode = codeLinesArray.map((line, codeIndex) => {
        const originalLine = codeLineToOriginalLine.get(codeIndex)
        if (originalLine !== undefined) {
          lineMappingRef.current.set(transformedLineNum, originalLine)
        } else {
          const fallbackLine = codeIndex + 1
          if (fallbackLine <= lines.length) {
            lineMappingRef.current.set(transformedLineNum, fallbackLine)
          }
        }

        transformedLineNum++

        if (line.trim().length === 0) {
          return ''
        }

        return '    ' + line
      }).join('\n')

      const wrappedCode = `${importsCode}async def _run_code():\n${indentedCode}\n\n# Executar o código assíncrono\nawait _run_code()`

      if (executionAbortedRef.current) {
        updateTabOutput(activeTabId, '⚠️ Execução interrompida pelo usuário', false)
        return
      }

      const result = await pyodide.runPythonAsync(wrappedCode).catch(async (err: any) => {
        if (executionAbortedRef.current) {
          return null
        }
        const errorStr = String(err)
        if (errorStr.includes('KeyboardInterrupt')) {
          if (errorStr.includes('Execução interrompida pelo usuário') || executionAbortedRef.current) {
            return null
          }
        }

        try {
          if (pyodide && typeof (pyodide as any).getException === 'function') {
            const fullTraceback = (pyodide as any).getException()
            if (fullTraceback) {
              const enhancedError = new Error(String(err))
              ; (enhancedError as any).pyodideTraceback = fullTraceback
              throw enhancedError
            }
          }
        } catch {
          // Continuar com o erro original
        }

        throw err
      })

      if (executionAbortedRef.current) {
        const currentOutput = outputBufferRef.current.join('')
        const cancelMessage = currentOutput ? '\n\n⚠️ Execução interrompida pelo usuário' : '⚠️ Execução interrompida pelo usuário'
        updateTabOutput(activeTabId, currentOutput + cancelMessage, false)
        return
      }

      let finalOutput = outputBufferRef.current.join('')
      finalOutput = finalOutput.replace(/\n\n+/g, '\n\n')
      finalOutput = finalOutput.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      finalOutput = finalOutput.replace(/\n+$/, finalOutput.trim() ? '\n' : '')

      if (result !== undefined && result !== null && result !== '') {
        const resultStr = String(result)
        if (resultStr !== 'None') {
          if (finalOutput) {
            finalOutput += `\n${resultStr}`
          } else {
            finalOutput = resultStr
          }
        }
      }

      setErrorLine(null)
      updateTabOutput(activeTabId, finalOutput || 'Código executado com sucesso!', false)
    } catch (err) {
      const errorStr = String(err)
      const isKeyboardInterrupt = errorStr.includes('KeyboardInterrupt')
      const isUserCancelled = errorStr.includes('Execução interrompida pelo usuário') || executionAbortedRef.current

      if (isKeyboardInterrupt && isUserCancelled) {
        const currentOutput = outputBufferRef.current.join('')
        const cancelMessage = currentOutput ? '\n\n⚠️ Execução interrompida pelo usuário' : '⚠️ Execução interrompida pelo usuário'
        updateTabOutput(activeTabId, currentOutput + cancelMessage, false)
        setErrorLine(null)
        return
      }

      if (executionAbortedRef.current) {
        const currentOutput = outputBufferRef.current.join('')
        const cancelMessage = currentOutput ? '\n\n⚠️ Execução interrompida pelo usuário' : '⚠️ Execução interrompida pelo usuário'
        updateTabOutput(activeTabId, currentOutput + cancelMessage, false)
        setErrorLine(null)
        return
      }

      const capturedOutput = outputBufferRef.current.join('')

      logger.debug('=== ERRO CAPTURADO ===')
      logger.debug('Erro:', err)
      logger.debug('String do erro:', String(err))
      logger.debug('Tipo do erro:', typeof err)
      if (err && typeof err === 'object') {
        logger.debug('Chaves do erro:', Object.keys(err))
        logger.debug('Erro completo:', JSON.stringify(err, null, 2))
      }
      logger.debug('Mapeamento disponível:', Array.from(lineMappingRef.current.entries()))
      logger.debug('=====================')

      const parsedError = parsePyodideError(
        err,
        code,
        fileName,
        lineMappingRef.current
      )

      logger.debug('=== RESULTADO DO PARSING ===')
      logger.debug('Tipo:', parsedError.type)
      logger.debug('Linha:', parsedError.line)
      logger.debug('Mensagem:', parsedError.message)
      logger.debug('É erro de sintaxe:', parsedError.isSyntaxError)
      logger.debug('===========================')

      setErrorLine(parsedError.line)

      let errorOutput = ''

      if (capturedOutput.trim()) {
        errorOutput = capturedOutput + '\n'
      }

      errorOutput += parsedError.formattedTraceback
      errorOutput += '\n** Process exited - Return Code: 1 **\n'

      updateTabOutput(activeTabId, errorOutput || 'Erro ao executar código', true)
    } finally {
      if (!executionAbortedRef.current) {
        setIsExecuting(false)
      }
      setIsWaitingInput(false)
      setInputPrompt('')
      inputResolveRef.current = null
      inputRejectRef.current = null
    }
  }, [pyodide, loading, isExecuting, code, fileName, activeTabId, updateTabOutput, setErrorLine])

  const onInputSubmit = useCallback((value: string) => {
    const promptText = inputPrompt || ''
    const inputLine = promptText + value + '\n'

    const currentOutput = outputBufferRef.current.join('')
    const newOutput = currentOutput + inputLine
    updateTabOutput(activeTabId, newOutput, false)

    outputBufferRef.current.push(inputLine)

    setIsWaitingInput(false)
    setInputPrompt('')
    if (inputResolveRef.current) {
      inputResolveRef.current(value)
      inputResolveRef.current = null
    }
  }, [inputPrompt, activeTabId, updateTabOutput])

  return {
    executeCode,
    stopExecution,
    isExecuting,
    isWaitingInput,
    inputPrompt,
    onInputSubmit,
    lineMappingRef,
  }
}

