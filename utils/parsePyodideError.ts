import { logger } from './logger'

/**
 * Interface para o resultado do parsing de erros do Pyodide
 */
export interface ParsedError {
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
export function parsePyodideError(
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
    logger.debug('🔍 Linhas encontradas no traceback:', lineMatchesArray.map(m => m[1]))

    // Se houver múltiplas linhas no traceback, usar a última (mais próxima do erro)
    // A última linha geralmente é a linha dentro de _run_code onde o erro realmente ocorreu
    if (lineMatchesArray.length > 1) {
      // Pegar a última linha do traceback (mais próxima do erro)
      lineMatch = lineMatchesArray[lineMatchesArray.length - 1]
      logger.debug('✅ Múltiplas linhas no traceback, usando a última (mais próxima do erro):', lineMatch[1])
    } else {
      lineMatch = lineMatchesArray[0]
      logger.debug('✅ Linha única no traceback:', lineMatch[1])
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
      logger.debug('✅ Linha extraída de IndentationError:', indentationMatch[1])
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
    logger.debug('⚠️ Não foi possível extrair linha do erro:', {
      errorStr: cleanErrorStr.substring(0, 500),
      errorType: typeof error,
      errorKeys: error && typeof error === 'object' ? Object.keys(error) : null,
      fullError: error
    })
  } else {
    logger.debug('✅ Linha extraída do erro:', {
      lineNum: parseInt(lineMatch[1], 10),
      match: lineMatch[0],
      hasMapping: lineMapping !== undefined && lineMapping !== null && lineMapping.size > 0
    })
  }

  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1], 10)
    logger.debug('🔍 Tentando mapear linha do erro:', {
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
        logger.debug('✅ Linha mapeada diretamente:', { lineNum, mappedLine })
      } else {
        logger.debug('⚠️ Linha não encontrada no mapeamento direto, tentando linha mais próxima...')
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
          logger.debug('✅ Linha encontrada via linha mais próxima:', { lineNum, closestLine, minDiff })
        } else {
          logger.debug('⚠️ Linha mais próxima muito distante, tentando cálculo direto...', { lineNum, closestLine, minDiff })
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
                  logger.debug('✅ Linha encontrada via fallback direto:', { codeLineIndex, originalLineCounter })
                  break
                }

                codeLineCounter++
                originalLineCounter++
              }
            }

            // Último recurso: usar a linha diretamente se estiver no range
            if (!errorLine && lineNum > 0 && lineNum <= codeLines.length) {
              errorLine = lineNum
              logger.debug('⚠️ Usando linha diretamente como último recurso:', lineNum)
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

