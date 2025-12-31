'use client'

import { useRef, useEffect, useMemo } from 'react'

interface PythonEditorProps {
  code: string
  onChange: (code: string) => void
  disabled?: boolean
  fileName?: string
  errorLine?: number | null
}

// Função para fazer syntax highlighting do código Python
function highlightPythonCode(code: string): string {
  if (!code) return ''

  // Palavras-chave do Python
  const keywords = new Set([
    'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else',
    'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
    'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try',
    'while', 'with', 'yield', 'async', 'await'
  ])

  // Funções built-in comuns
  const builtins = new Set([
    'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes', 'callable', 'chr',
    'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod', 'enumerate',
    'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr', 'globals', 'hasattr',
    'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance', 'issubclass', 'iter', 'len',
    'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object', 'oct', 'open',
    'ord', 'pow', 'print', 'property', 'range', 'repr', 'reversed', 'round', 'set', 'setattr',
    'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip'
  ])

  const lines = code.split('\n')
  const highlightedLines: string[] = []

  type State =
    | { type: 'code' }
    | { type: 'string', char: string, isFString: boolean }

  for (const line of lines) {
    let result = ''
    let i = 0
    const stack: State[] = [{ type: 'code' }]

    while (i < line.length) {
      const char = line[i]
      const currentState = stack[stack.length - 1]

      // Estado: STRING
      if (currentState.type === 'string') {
        const { char: stringQuote, isFString } = currentState

        // Verificar fim da string
        // Nota: não lidamos com escapes complexos aqui para simplicidade, mas o básico sim
        if (char === stringQuote && (i === 0 || line[i - 1] !== '\\' || (i > 1 && line[i - 2] === '\\'))) {
          result += `${char}</span>`
          stack.pop()
          i++
          continue
        }

        // F-String: interpolação
        if (isFString) {
          // Check for escaped braces {{ or }}
          if (char === '{' && line[i + 1] === '{') {
            result += '{{'
            i += 2
            continue
          }
          if (char === '}' && line[i + 1] === '}') {
            result += '}}'
            i += 2
            continue
          }

          // Início de interpolação
          if (char === '{') {
            result += `</span><span class="text-purple-600 dark:text-purple-400 font-semibold">{</span>`
            stack.push({ type: 'code' })
            i++
            continue
          }
        }

        // Conteúdo normal da string
        result += char
        i++
        continue
      }

      // Comentário (apenas se não estiver em string, o que já é garantido pelo 'else' do estado)
      if (char === '#') {
        result += `<span class="text-gray-500 dark:text-gray-400 italic">${line.substring(i)}</span>`
        break // Comentário vai até o fim da linha
      }

      // Início de String
      if (char === '"' || char === "'") {
        let isFString = false
        if (i > 0) {
          const prevChar = line[i - 1]
          if (prevChar === 'f' || prevChar === 'F') {
            isFString = true
          }
        }

        stack.push({ type: 'string', char, isFString })
        // Se for f-string, mudar a cor base da string? O usuário não pediu, mas verde é padrão.
        // Dentro da string f-string, o verde continua, exceto nas variáveis.
        result += `<span class="text-green-600 dark:text-green-400">${char}`
        i++
        continue
      }

      // Fim de interpolação f-string (chaveta fechando)
      // Só se não estivermos na base (stack > 1)
      if (char === '}' && stack.length > 1) {
        stack.pop() // Sai do modo code, volta para string
        result += `<span class="text-purple-600 dark:text-purple-400 font-semibold">}</span><span class="text-green-600 dark:text-green-400">`
        i++
        continue
      }

      // Detectar números
      if (/\d/.test(char)) {
        let num = char
        let j = i + 1
        while (j < line.length && /[\d.]/.test(line[j])) {
          num += line[j]
          j++
        }
        result += `<span class="text-blue-600 dark:text-blue-400">${num}</span>`
        i = j
        continue
      }

      // Detectar palavras (keywords, builtins, variáveis)
      if (/[a-zA-Z_]/.test(char)) {
        let word = char
        let j = i + 1
        while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) {
          word += line[j]
          j++
        }

        // Verifica se é um 'f' prefixo de string (lookahead)
        if ((word === 'f' || word === 'F') && (line[j] === '"' || line[j] === "'")) {
          result += `<span class="text-blue-800 dark:text-blue-300 font-bold">${word}</span>`
        } else if (keywords.has(word)) {
          result += `<span class="text-blue-800 dark:text-blue-300 font-semibold">${word}</span>`
        } else if (builtins.has(word)) {
          result += `<span class="text-cyan-600 dark:text-cyan-400">${word}</span>`
        } else {
          result += word
        }
        i = j
        continue
      }

      // Detectar operadores e pontuação
      if (['=', '+', '-', '*', '/', '%', '<', '>', '!', '(', ')', '[', ']', '{', '}', ',', '.', ':'].includes(char)) {
        let op = char
        let j = i + 1

        // Operadores compostos e parênteses coloridos
        if (['(', ')'].includes(char)) {
          result += `<span class="text-purple-600 dark:text-purple-400 font-semibold">${char}</span>`
          i++
          continue
        }
        if (['[', ']'].includes(char)) {
          result += `<span class="text-orange-600 dark:text-orange-400 font-semibold">${char}</span>`
          i++
          continue
        }
        // Chaves são especiais pois podem ser dicionário OU interpolação.
        if (['{', '}'].includes(char)) {
          result += `<span class="text-pink-600 dark:text-pink-400 font-semibold">${char}</span>`
          i++
          continue
        }

        // Operadores normais
        if (j < line.length) {
          const twoCharOp = char + line[j]
          if (['==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '//', '**'].includes(twoCharOp)) {
            op = twoCharOp
            j++
          }
        }
        result += `<span class="text-red-600 dark:text-red-400">${op}</span>`
        i = j
        continue
      }

      // Caractere desconhecido ou espaço
      result += char
      i++
    }

    if (stack[stack.length - 1].type === 'string') {
      result += '</span>'
    }

    highlightedLines.push(result)
  }

  return highlightedLines.join('\n')
}

export function PythonEditor({
  code,
  onChange,
  disabled,
  fileName = 'editor.py',
  errorLine,
  onRun,
  fontSize = 14
}: PythonEditorProps & { onRun?: () => void; fontSize?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  // Calcular line-height baseado no tamanho da fonte (1.5x)
  const lineHeight = Math.round(fontSize * 1.5)

  // Gerar código com syntax highlighting
  const highlightedCode = useMemo(() => {
    return highlightPythonCode(code)
  }, [code])

  useEffect(() => {
    const textarea = textareaRef.current
    const highlight = highlightRef.current
    if (!textarea || !highlight) return

    // Auto-resize do textarea
    textarea.style.height = 'auto'
    const textareaHeight = textarea.scrollHeight
    textarea.style.height = `${textareaHeight}px`

    // Garantir que o overlay tenha a mesma altura mínima
    highlight.style.minHeight = `${textareaHeight}px`
    highlight.style.height = 'auto'

    // Sincronizar scroll entre textarea e highlight overlay
    const syncScroll = () => {
      highlight.scrollTop = textarea.scrollTop
      highlight.scrollLeft = textarea.scrollLeft
    }

    // Sincronizar scroll inicial
    syncScroll()

    textarea.addEventListener('scroll', syncScroll)
    return () => textarea.removeEventListener('scroll', syncScroll)
  }, [code, fontSize, highlightedCode]) // Re-run quando código, fontSize ou highlighting mudar

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    // Atalho para executar código (Ctrl + Enter ou Cmd + Enter)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onRun?.()
      return
    }

    // Mapeamento de caracteres de abertura para fechamento
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
    }

    // Tratamento para Enter - indentação automática
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      // Obter o código até a posição do cursor
      const codeBeforeCursor = code.substring(0, start)
      const codeAfterCursor = code.substring(end)

      // Encontrar a linha atual
      const lines = codeBeforeCursor.split('\n')
      const currentLine = lines[lines.length - 1]

      // Calcular a indentação da linha atual (espaços no início)
      const indentMatch = currentLine.match(/^(\s*)/)
      const currentIndent = indentMatch ? indentMatch[1] : ''

      // Remover espaços em branco do final da linha para verificar se termina com ':'
      const trimmedLine = currentLine.trim()
      const endsWithColon = trimmedLine.endsWith(':')

      // Calcular a indentação da nova linha
      let newIndent = currentIndent
      if (endsWithColon) {
        // Se a linha termina com ':', adicionar 4 espaços de indentação
        newIndent = currentIndent + '    '
      }

      // Inserir nova linha com indentação
      const newCode = codeBeforeCursor + '\n' + newIndent + codeAfterCursor
      onChange(newCode)

      // Posicionar o cursor na nova linha com a indentação
      setTimeout(() => {
        const newCursorPos = start + 1 + newIndent.length
        textarea.selectionStart = textarea.selectionEnd = newCursorPos
      }, 0)
      return
    }

    // Tratamento para Tab
    if (e.key === 'Tab') {
      e.preventDefault()

      if (e.shiftKey) {
        // Shift + Tab: Desindentar
        const startLineStart = code.lastIndexOf('\n', start - 1) + 1
        const endLineEnd = code.indexOf('\n', end)

        const lines = code.split('\n')
        let currentLineIndex = code.substring(0, start).split('\n').length - 1
        const lastLineIndex = code.substring(0, end).split('\n').length - 1

        let newCode = code

        // Iterar sobre as linhas afetadas
        const newLines = [...lines]
        for (let i = currentLineIndex; i <= lastLineIndex; i++) {
          const line = newLines[i]
          if (line.startsWith('    ')) {
            newLines[i] = line.substring(4)
          } else if (line.startsWith('\t')) {
            newLines[i] = line.substring(1)
          } else {
            const match = line.match(/^(\s+)/)
            if (match) {
              const spaces = match[1].length
              const toRemove = Math.min(spaces, 4)
              newLines[i] = line.substring(toRemove)
            }
          }
        }

        newCode = newLines.join('\n')

        if (newCode !== code) {
          onChange(newCode)
          setTimeout(() => {
            textarea.selectionStart = Math.max(0, start - 4)
            textarea.selectionEnd = Math.max(0, end - (lines.length !== newLines.length ? 0 : 4))
          }, 0)
        }
        return
      }

      // Tab normal: Indentar
      const newCode = code.substring(0, start) + '    ' + code.substring(end)
      onChange(newCode)

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4
      }, 0)
      return
    }

    // Tratamento para Backspace (Smart Backspace)
    if (e.key === 'Backspace' && start === end && start > 0) {
      const codeBeforeCursor = code.substring(0, start)
      const lines = codeBeforeCursor.split('\n')
      const currentLine = lines[lines.length - 1]

      if (/^\s+$/.test(currentLine) && currentLine.length >= 4 && currentLine.length % 4 === 0) {
        e.preventDefault()
        const newCode = code.substring(0, start - 4) + code.substring(end)
        onChange(newCode)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start - 4
        }, 0)
        return
      }

      const charBefore = code[start - 1]
      const charAfter = code[start]
      // Remove par
      if ((charBefore === '"' && charAfter === '"') ||
        (charBefore === "'" && charAfter === "'")) {
        e.preventDefault()
        const newCode = code.substring(0, start - 1) + code.substring(start + 1)
        onChange(newCode)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start - 1
        }, 0)
        return
      }

      for (const [open, close] of Object.entries(pairs)) {
        if (charBefore === open && charAfter === close) {
          e.preventDefault()
          const newCode = code.substring(0, start - 1) + code.substring(start + 1)
          onChange(newCode)
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start - 1
          }, 0)
          return
        }
      }
    }

    // Tratamento para caracteres de abertura e fechamento automático
    if (pairs[e.key] && start === end) {
      const beforeChar = code[start - 1] || ''
      const afterChar = code[start] || ''
      const closingChar = pairs[e.key]

      if (beforeChar !== '\\') {
        // Lógica simplificada de aninhamento
        let openCount = 0
        let closeCount = 0
        for (let i = 0; i < start; i++) {
          const char = code[i]
          if (char === e.key) openCount++
          if (char === closingChar) closeCount++
        }
        const isInsideNested = openCount > closeCount

        if (afterChar === closingChar && !isInsideNested) {
          e.preventDefault()
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 1
          }, 0)
          return
        }

        e.preventDefault()
        const newCode = code.substring(0, start) + e.key + closingChar + code.substring(end)
        onChange(newCode)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1
        }, 0)
        return
      }
    }

    // Delete par
    if (e.key === 'Delete' && start === end && start < code.length) {
      const charAt = code[start]
      const charAfter = code[start + 1]
      if ((charAt === '"' && charAfter === '"') || (charAt === "'" && charAfter === "'")) {
        e.preventDefault()
        const newCode = code.substring(0, start) + code.substring(start + 2)
        onChange(newCode)
        setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = start }, 0)
        return
      }
      for (const [open, close] of Object.entries(pairs)) {
        if (charAt === open && charAfter === close) {
          e.preventDefault()
          const newCode = code.substring(0, start) + code.substring(start + 2)
          onChange(newCode)
          setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = start }, 0)
          return
        }
      }
    }
  }

  // Dividir o código em linhas para destacar a linha de erro
  const lines = code.split('\n')
  const lineNumbers = lines.map((_, i) => i + 1)

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex-1 flex overflow-auto relative bg-gray-50 dark:bg-gray-900">
        {/* Números das linhas */}
        <div
          className="flex-shrink-0 px-3 py-4 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-right font-mono select-none"
          style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px` }}
        >
          {lineNumbers.map((num) => (
            <div
              key={num}
              className={`${errorLine === num ? 'text-red-600 dark:text-red-400 font-bold bg-red-100 dark:bg-red-900/30' : ''}`}
            >
              {num}
            </div>
          ))}
        </div>
        {/* Editor */}
        <div className="flex-1 relative">
          {/* Overlay de syntax highlighting */}
          <div
            ref={highlightRef}
            className="absolute inset-0 p-4 font-mono pointer-events-none overflow-auto whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${lineHeight}px`,
              zIndex: 1,
              overflowY: 'auto',
              overflowX: 'auto',
            }}
          >
            {code ? (
              <div 
                style={{ minHeight: '100%' }}
                dangerouslySetInnerHTML={{ 
                  __html: highlightedCode || code.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') 
                }} 
              />
            ) : (
              <div className="text-gray-400 dark:text-gray-500 opacity-50">
                Digite seu código Python aqui...
              </div>
            )}
          </div>
          {/* Textarea transparente para input */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="relative w-full h-full p-4 bg-transparent text-transparent font-mono resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed caret-black dark:caret-white"
            placeholder="Digite seu código Python aqui..."
            spellCheck={false}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${lineHeight}px`,
              zIndex: 2,
            }}
          />
          {/* Indicador visual da linha de erro */}
          {errorLine && (
            <div
              className="absolute left-0 right-0 border-l-2 border-red-500 pointer-events-none z-10 bg-red-500/10"
              style={{
                top: `${(errorLine - 1) * lineHeight + 16}px`, // 16px é o padding-top
                height: `${lineHeight}px`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

