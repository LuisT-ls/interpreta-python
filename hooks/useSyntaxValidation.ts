'use client'

import { useState, useEffect, useRef } from 'react'
import { logger } from '@/utils/logger'

interface UseSyntaxValidationOptions {
  pyodide: any
  loading: boolean
  isExecuting: boolean
  code: string
  fileName: string
  debounceMs?: number
}

/**
 * Hook para validação em tempo real de sintaxe Python
 * Detecta erros de sintaxe enquanto o usuário digita
 * Apenas valida erros de sintaxe (SyntaxError, IndentationError, TabError)
 */
export function useSyntaxValidation({
  pyodide,
  loading,
  isExecuting,
  code,
  fileName,
  debounceMs = 800,
}: UseSyntaxValidationOptions) {
  const [errorLine, setErrorLine] = useState<number | null>(null)
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Limpar timeout anterior se existir
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    // Não validar se:
    // - Pyodide não está carregado
    // - Está executando código
    // - Código está vazio
    if (!pyodide || loading || isExecuting || !code.trim()) {
      // Se código está vazio, limpar erro
      if (!code.trim()) {
        setErrorLine(null)
      }
      return
    }

    // Debounce: aguardar após o usuário parar de digitar
    validationTimeoutRef.current = setTimeout(async () => {
      try {
        // Escapar o código para uso em string Python
        const escapedCode = code
          .replace(/\\/g, '\\\\')  // Escapar backslashes
          .replace(/"/g, '\\"')    // Escapar aspas duplas
          .replace(/\n/g, '\\n')   // Escapar quebras de linha
          .replace(/\r/g, '\\r')   // Escapar carriage return
          .replace(/\t/g, '\\t')   // Escapar tabs

        // Tentar compilar o código usando compile() do Python
        // Isso detecta apenas erros de sintaxe, sem executar o código
        pyodide.runPython(`
try:
    compile("""${escapedCode}""", "${fileName}", "exec")
    __syntax_check_passed = True
    __syntax_error_obj = None
except SyntaxError as e:
    __syntax_check_passed = False
    __syntax_error_obj = e
except IndentationError as e:
    __syntax_check_passed = False
    __syntax_error_obj = e
except TabError as e:
    __syntax_check_passed = False
    __syntax_error_obj = e
except Exception:
    # Outros erros não são de sintaxe, considerar válido para validação em tempo real
    __syntax_check_passed = True
    __syntax_error_obj = None
`)

        const isValid = pyodide.globals.get('__syntax_check_passed')
        const syntaxError = pyodide.globals.get('__syntax_error_obj')

        if (!isValid && syntaxError) {
          // Erro de sintaxe detectado
          try {
            // Extrair linha do erro
            const errorLine = extractSyntaxErrorLine(syntaxError, code)
            setErrorLine(errorLine)
          } catch (parseErr) {
            // Se falhar ao parsear, tentar extrair linha diretamente
            try {
              const errorStr = String(syntaxError)
              const lineMatch = errorStr.match(/line\s+(\d+)/i)
              if (lineMatch) {
                const lineNum = parseInt(lineMatch[1], 10)
                if (lineNum > 0 && lineNum <= code.split('\n').length) {
                  setErrorLine(lineNum)
                } else {
                  setErrorLine(null)
                }
              } else {
                setErrorLine(null)
              }
            } catch {
              setErrorLine(null)
            }
          }
        } else {
          // Código válido sintaticamente, limpar erro
          setErrorLine(null)
        }

        // Limpar variáveis temporárias
        try {
          pyodide.runPython('del __syntax_check_passed, __syntax_error_obj')
        } catch {
          // Ignorar erros ao limpar
        }
      } catch (err) {
        // Se houver erro na validação, não fazer nada
        // Isso pode acontecer se o código tiver caracteres especiais problemáticos
        // Não definir erro para não confundir o usuário
        logger.debug('Erro na validação em tempo real:', err)
      }
    }, debounceMs)

    // Cleanup: limpar timeout quando componente desmontar ou dependências mudarem
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current)
      }
    }
  }, [code, fileName, pyodide, loading, isExecuting, debounceMs])

  return { errorLine, setErrorLine }
}

/**
 * Extrai a linha do erro de sintaxe de um objeto de erro do Pyodide
 * Versão simplificada para validação em tempo real
 */
function extractSyntaxErrorLine(error: any, code: string): number | null {
  const errorStr = String(error)

  // Buscar todas as ocorrências de "File ..., line X"
  const allLineMatches = errorStr.matchAll(/File\s+["<](?:exec|.*?)[">],\s+line\s+(\d+)/gi)
  const lineMatchesArray = Array.from(allLineMatches)

  let lineMatch: RegExpMatchArray | null = null

  if (lineMatchesArray.length > 0) {
    // Se houver múltiplas linhas no traceback, usar a última (mais próxima do erro)
    if (lineMatchesArray.length > 1) {
      lineMatch = lineMatchesArray[lineMatchesArray.length - 1]
    } else {
      lineMatch = lineMatchesArray[0]
    }
  }

  // Para IndentationError, procurar padrão especial
  if (!lineMatch && errorStr.includes('IndentationError')) {
    let indentationMatch = errorStr.match(/(?:on|at)\s+line\s+(\d+)/i)
    if (!indentationMatch) {
      indentationMatch = errorStr.match(/after\s+.*?\s+on\s+line\s+(\d+)/i)
    }
    if (!indentationMatch) {
      indentationMatch = errorStr.match(/line\s+(\d+)/i)
    }
    if (indentationMatch) {
      lineMatch = indentationMatch
    }
  }

  // Se não encontrou no formato File, tentar formato mais simples
  if (!lineMatch) {
    lineMatch = errorStr.match(/line\s+(\d+)/i)
  }

  // Tentar extrair de objetos de erro do Python diretamente
  if (!lineMatch && error && typeof error === 'object') {
    try {
      const errorObj = error as any

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

  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1], 10)
    const codeLines = code.split('\n')

    // Validar se a linha está no range válido
    if (lineNum > 0 && lineNum <= codeLines.length) {
      return lineNum
    }
  }

  return null
}

