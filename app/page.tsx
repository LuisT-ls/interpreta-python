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
  const [errorLine, setErrorLine] = useState<number | null>(null)
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
        pyodide.setStdout({ batched: () => {} })
        pyodide.setStderr({ batched: () => {} })
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
            
            // Atualizar a saída em tempo real para que os print() apareçam imediatamente
            const currentOutput = outputBufferRef.current.join('')
            updateTabOutput(activeTabId, currentOutput, false)
          }
        } catch (e) {
          // Ignorar erros no handler para evitar loops
          console.error('Erro no stdout handler:', e)
        }
      }

      const stderrHandler = (text: string) => {
        try {
          if (text && typeof text === 'string' && text.length > 0) {
            // Ignorar KeyboardInterrupt causado por cancelamento do usuário
            if (executionAbortedRef.current && text.includes('KeyboardInterrupt') && text.includes('Execução interrompida pelo usuário')) {
              return // Não adicionar ao buffer
            }
            outputBufferRef.current.push(text + '\n')
            // Atualizar a saída em tempo real também para erros
            const currentOutput = outputBufferRef.current.join('')
            updateTabOutput(activeTabId, currentOutput, true)
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
      
      // Criar mapeamento de linhas: linha no código transformado -> linha no código original
      // Primeiro, criar um mapa de codeLines index -> linha original
      const codeLineToOriginalLine = new Map<number, number>()
      let originalLineNum = 1
      let codeLineCounter = 0
      let skippedEmptyAtStart = false
      
      for (let i = 0; i < lines.length; i++) {
        const originalLine = lines[i]
        const trimmed = originalLine.trim()
        
        // Pular linhas vazias no início (apenas uma vez)
        if (trimmed.length === 0 && !skippedEmptyAtStart && imports.length === 0 && codeLineCounter === 0) {
          skippedEmptyAtStart = true
          originalLineNum++
          continue
        }
        
        // Pular imports
        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
          originalLineNum++
          continue
        }
        
        // Esta é uma linha de código (mesmo que seja vazia depois dos imports)
        codeLineToOriginalLine.set(codeLineCounter, originalLineNum)
        codeLineCounter++
        originalLineNum++
      }
      
      console.log('codeLineToOriginalLine criado:', Array.from(codeLineToOriginalLine.entries()))
      
      // Calcular onde começa o código dentro de _run_code
      // Estrutura do código transformado:
      // - Se há imports: imports (N linhas) + linha vazia (1 linha) + def (1 linha) = N + 2
      // - Se não há imports: def (1 linha) = 1
      let transformedLineNum = 1
      if (imports.length > 0) {
        transformedLineNum += imports.length // linhas de imports
        transformedLineNum++ // linha vazia após imports
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
          console.log(`✅ Mapeando linha transformada ${transformedLineNum} -> linha original ${originalLine} (codeIndex: ${codeIndex})`)
        } else {
          console.warn(`⚠️ Não encontrou mapeamento para codeIndex ${codeIndex} (total codeLines: ${codeLinesArray.length}, total mapeamento: ${codeLineToOriginalLine.size})`)
        }
        
        // Incrementar após mapear
        transformedLineNum++
        
        // Não indentar linhas vazias
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

      const result = await pyodide.runPythonAsync(wrappedCode).catch((err) => {
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
        return
      }
      
      // Também verificar se foi cancelado (mesmo sem KeyboardInterrupt explícito)
      if (executionAbortedRef.current) {
        const currentOutput = outputBufferRef.current.join('')
        const cancelMessage = currentOutput ? '\n\n⚠️ Execução interrompida pelo usuário' : '⚠️ Execução interrompida pelo usuário'
        updateTabOutput(activeTabId, currentOutput + cancelMessage, false)
        return
      }
      
      // Capturar qualquer saída que possa ter sido gerada antes do erro
      const capturedOutput = outputBufferRef.current.join('')
      
      const errorMessage = err instanceof Error ? err.message : String(err)
      
      // Limpar a string do erro para remover duplicações e formatações indesejadas
      // Remover "PythonError: " se presente no início
      let cleanErrorStr = errorStr.replace(/^PythonError:\s*/i, '').trim()
      
      // Parsear o traceback para extrair informações do erro
      let parsedErrorLine: number | null = null
      let errorType = 'Erro'
      let errorDetails = errorMessage
      
      // Tentar extrair a linha do erro do traceback
      // Formato típico: File "<exec>", line X, in <module> ou File "<exec>", line X, in _run_code
      const lineMatch = cleanErrorStr.match(/File\s+["<]exec[">],\s+line\s+(\d+)/i)
      if (lineMatch) {
        const lineNum = parseInt(lineMatch[1], 10)
        
        // Debug: verificar o mapeamento
        console.log('Linha do erro no traceback:', lineNum)
        console.log('Mapeamento disponível:', Array.from(lineMappingRef.current.entries()))
        
        // Usar o mapeamento criado durante a transformação
        const mappedLine = lineMappingRef.current.get(lineNum)
        if (mappedLine) {
          parsedErrorLine = mappedLine
          console.log('Linha mapeada encontrada:', mappedLine)
        } else {
          // Se não encontrou no mapeamento, tentar uma abordagem alternativa
          // Procurar a linha mais próxima no mapeamento
          let closestLine: number | null = null
          let minDiff = Infinity
          
          for (const [transformedLine, originalLine] of lineMappingRef.current.entries()) {
            const diff = Math.abs(transformedLine - lineNum)
            if (diff < minDiff) {
              minDiff = diff
              closestLine = originalLine
            }
          }
          
          if (closestLine !== null && minDiff <= 3) {
            parsedErrorLine = closestLine
            console.log('✅ Usando linha mais próxima:', closestLine, '(diff:', minDiff, ')')
          } else {
            // Tentar calcular diretamente baseado na estrutura
            const originalCodeLines = activeTab.code.split('\n')
            // Calcular o número de imports diretamente (já que imports não está acessível aqui)
            const importsCount = originalCodeLines.filter(line => {
              const trimmed = line.trim()
              return trimmed.startsWith('import ') || trimmed.startsWith('from ')
            }).length
            const baseOffset = importsCount > 0 ? importsCount + 2 : 2 // imports + linha vazia + def
            
            // Se a linha do erro está dentro do código transformado
            if (lineNum > baseOffset) {
              const codeLineIndex = lineNum - baseOffset
              // Recalcular o mapeamento para encontrar a linha original
              let codeLineCounter = 0
              let originalLineCounter = 1
              
              for (let i = 0; i < originalCodeLines.length; i++) {
                const line = originalCodeLines[i]
                const trimmed = line.trim()
                
                // Pular linhas vazias no início
                if (trimmed.length === 0 && importsCount === 0 && codeLineCounter === 0) {
                  originalLineCounter++
                  continue
                }
                
                // Pular imports
                if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
                  originalLineCounter++
                  continue
                }
                
                // Esta é uma linha de código
                if (codeLineCounter === codeLineIndex) {
                  parsedErrorLine = originalLineCounter
                  console.log('✅ Linha calculada diretamente:', originalLineCounter, 'para codeLineIndex', codeLineIndex)
                  break
                }
                
                codeLineCounter++
                originalLineCounter++
              }
              
              // Se ainda não encontrou, usar fallback
              if (!parsedErrorLine && lineNum > 0 && lineNum <= originalCodeLines.length) {
                parsedErrorLine = lineNum
                console.log('⚠️ Usando linha direta (fallback):', lineNum)
              }
            } else if (lineNum > 0 && lineNum <= originalCodeLines.length) {
              parsedErrorLine = lineNum
              console.log('⚠️ Usando linha direta (fallback 2):', lineNum)
            }
          }
        }
      }
      
      // Tentar extrair o tipo de erro (NameError, ValueError, etc.)
      // Para SyntaxError, procurar primeiro pois tem formato especial
      if (cleanErrorStr.includes('SyntaxError')) {
        errorType = 'SyntaxError'
        // Extrair a mensagem do SyntaxError
        const syntaxMatch = cleanErrorStr.match(/SyntaxError:\s*(.+?)(?:\n|$)/i)
        if (syntaxMatch) {
          errorDetails = syntaxMatch[1].trim()
        } else {
          // Tentar extrair de outra forma
          const typeIndex = cleanErrorStr.indexOf('SyntaxError')
          const afterType = errorStr.substring(typeIndex + 'SyntaxError'.length).trim()
          if (afterType.startsWith(':')) {
            errorDetails = afterType.substring(1).trim().split('\n')[0]
          } else {
            errorDetails = 'syntax error'
          }
        }
      } else {
        const errorTypeMatch = cleanErrorStr.match(/(\w+Error|Exception):\s*(.+?)(?:\n|$)/i)
        if (errorTypeMatch) {
          errorType = errorTypeMatch[1]
          errorDetails = errorTypeMatch[2].trim()
        } else {
          // Tentar encontrar o tipo de erro de outra forma
          const commonErrors = ['NameError', 'TypeError', 'ValueError', 'IndentationError', 'AttributeError', 'KeyError', 'IndexError', 'ZeroDivisionError', 'FileNotFoundError']
          for (const errType of commonErrors) {
            if (cleanErrorStr.includes(errType)) {
              errorType = errType
              // Extrair a mensagem após o tipo de erro
              const typeIndex = cleanErrorStr.indexOf(errType)
              const afterType = cleanErrorStr.substring(typeIndex + errType.length).trim()
              if (afterType.startsWith(':')) {
                errorDetails = afterType.substring(1).trim().split('\n')[0]
              } else {
                // Tentar extrair da mensagem completa
                const messageMatch = cleanErrorStr.match(new RegExp(`${errType}[^\\n]*:([^\\n]+)`, 'i'))
                if (messageMatch) {
                  errorDetails = messageMatch[1].trim()
                }
              }
              break
            }
          }
        }
      }
      
      // Se não encontrou detalhes, usar a mensagem de erro completa (limitada)
      if (!errorDetails || errorDetails === errorMessage) {
        // Tentar extrair apenas a parte relevante da mensagem
        const simpleMessage = errorMessage.split('\n')[0].trim()
        if (simpleMessage && simpleMessage !== errorMessage) {
          errorDetails = simpleMessage
        } else {
          // Tentar extrair da string completa do erro
          const lastLine = cleanErrorStr.split('\n').filter(line => line.trim()).pop() || ''
          if (lastLine.includes(':')) {
            const parts = lastLine.split(':')
            if (parts.length > 1) {
              errorDetails = parts.slice(1).join(':').trim()
            } else {
              errorDetails = errorMessage.substring(0, 200) // Limitar tamanho
            }
          } else {
            errorDetails = errorMessage.substring(0, 200) // Limitar tamanho
          }
        }
      }
      
      // Definir a linha do erro
      setErrorLine(parsedErrorLine)
      
      // Formatar erro no formato tradicional do Python
      let errorOutput = ''
      
      // Se houver saída capturada antes do erro, incluir
      if (capturedOutput.trim()) {
        errorOutput = capturedOutput + '\n'
      }
      
      // Para SyntaxError, exibir de forma mais direta com traceback
      if (errorType === 'SyntaxError') {
        // Formatar traceback no estilo Python
        errorOutput += 'Traceback (most recent call last):\n'
        
        // Determinar a linha do erro
        let errorLineNumber: number | null = parsedErrorLine
        if (!errorLineNumber) {
          // Tentar extrair a linha do traceback original se disponível
          const tracebackLineMatch = cleanErrorStr.match(/File\s+["<]exec[">],\s+line\s+(\d+)/i)
          if (tracebackLineMatch) {
            const lineNum = parseInt(tracebackLineMatch[1], 10)
            // Tentar mapear usando o mapeamento
            const mappedLine = lineMappingRef.current.get(lineNum)
            if (mappedLine) {
              errorLineNumber = mappedLine
            } else {
              errorLineNumber = lineNum
            }
          }
        }
        
        if (errorLineNumber) {
          // Obter a linha do código que causou o erro
          const codeLines = activeTab.code.split('\n')
          const errorCodeLine = codeLines[errorLineNumber - 1]
          
          errorOutput += `  File "${activeTab.name}", line ${errorLineNumber}, in <module>\n`
          
          if (errorCodeLine !== undefined && errorCodeLine.trim().length > 0) {
            // Mostrar a linha do código
            const trimmedLine = errorCodeLine.trimStart()
            errorOutput += `    ${trimmedLine}\n`
          }
        } else {
          errorOutput += `  File "${activeTab.name}", line ?, in <module>\n`
        }
        
        // Adicionar o tipo de erro e a mensagem
        errorOutput += `${errorType}: ${errorDetails}\n`
      } else {
        // Para outros erros (NameError, TypeError, etc.), usar o formato completo com traceback
        // Formatar traceback no estilo Python
        errorOutput += 'Traceback (most recent call last):\n'
        
        // Determinar a linha do erro
        let errorLineNumber: number | null = parsedErrorLine
        if (!errorLineNumber) {
          // Tentar extrair a linha do traceback original se disponível
          const tracebackLineMatch = cleanErrorStr.match(/File\s+["<]exec[">],\s+line\s+(\d+)/i)
          if (tracebackLineMatch) {
            const lineNum = parseInt(tracebackLineMatch[1], 10)
            // Tentar mapear usando o mapeamento
            const mappedLine = lineMappingRef.current.get(lineNum)
            if (mappedLine) {
              errorLineNumber = mappedLine
            } else {
              // Procurar a linha mais próxima
              let closestLine: number | null = null
              let minDiff = Infinity
              
              for (const [transformedLine, originalLine] of lineMappingRef.current.entries()) {
                const diff = Math.abs(transformedLine - lineNum)
                if (diff < minDiff) {
                  minDiff = diff
                  closestLine = originalLine
                }
              }
              
              if (closestLine !== null && minDiff <= 2) {
                errorLineNumber = closestLine
              } else {
                errorLineNumber = lineNum
              }
            }
          }
        }
        
        if (errorLineNumber) {
          // Obter a linha do código que causou o erro
          const codeLines = activeTab.code.split('\n')
          const errorCodeLine = codeLines[errorLineNumber - 1]
          
          errorOutput += `  File "${activeTab.name}", line ${errorLineNumber}, in <module>\n`
          
          if (errorCodeLine !== undefined && errorCodeLine.trim().length > 0) {
            // Mostrar a linha do código (remover espaços iniciais extras, mas manter indentação relativa)
            const trimmedLine = errorCodeLine.trimStart()
            errorOutput += `    ${trimmedLine}\n`
          }
        } else {
          errorOutput += `  File "${activeTab.name}", line ?, in <module>\n`
        }
        
        // Adicionar o tipo de erro e a mensagem
        errorOutput += `${errorType}: ${errorDetails}\n`
      }
      
      // Adicionar mensagem de saída do processo
      errorOutput += '\n** Process exited - Return Code: 1 **\n'
      
      // Se foi cancelado, não mostrar erro, apenas a mensagem de cancelamento
      if (executionAbortedRef.current) {
        const currentOutput = outputBufferRef.current.join('')
        const cancelMessage = currentOutput ? '\n\n⚠️ Execução interrompida pelo usuário' : '⚠️ Execução interrompida pelo usuário'
        updateTabOutput(activeTabId, currentOutput + cancelMessage, false)
        setErrorLine(null)
      } else {
        updateTabOutput(activeTabId, errorOutput || 'Erro ao executar código', true)
      }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {/* Logo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Logo Python"
                className="h-8 w-auto object-contain"
              />
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Interpretador Python Web
              </h1>
            </div>
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
            {/* Execute and Stop Buttons */}
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
                      onChange={(newCode) => {
                        updateTabCode(activeTabId, newCode)
                        setErrorLine(null) // Limpar erro quando o código é editado
                      }}
                      disabled={loading || isExecuting}
                      fileName={activeTab.name}
                      errorLine={errorLine}
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
                        // Adicionar o prompt e o valor digitado à saída antes de limpar o estado
                        const promptText = inputPrompt || ''
                        const inputLine = promptText + value + '\n'
                        
                        // Adicionar à saída atual
                        const currentOutput = activeTab.output
                        const newOutput = currentOutput + inputLine
                        updateTabOutput(activeTabId, newOutput, false)
                        
                        // Adicionar também ao buffer para manter consistência
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
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
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

