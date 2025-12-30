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
import { usePythonExecution } from '@/hooks/usePythonExecution'
import { FileSystemSidebar } from '@/components/FileSystemSidebar'
import { FileEditor } from '@/components/FileEditor'

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

  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)

  const { pyodide, loading, error } = usePyodide()
  const { layout, changeLayout, isMounted } = useLayout()
  const { isZenMode, toggleZenMode, isMounted: isZenMounted } = useZenMode()

  // Execução de código Python
  const {
    executeCode,
    stopExecution,
    isExecuting,
    isWaitingInput,
    inputPrompt,
    onInputSubmit,
  } = usePythonExecution({
    pyodide,
    loading,
    code: activeTab.code,
    fileName: activeTab.name,
    activeTabId,
    currentOutput: activeTab.output,
    updateTabOutput,
    setErrorLine: () => {}, // Será definido pelo hook de validação
  })

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

  // Estado para Sistema de Arquivos
  const [isFileSystemOpen, setIsFileSystemOpen] = useState(false)
  const [editingFilePath, setEditingFilePath] = useState<string | null>(null)

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
    {
      id: 'toggle-filesystem',
      label: isFileSystemOpen ? 'Fechar Sistema de Arquivos' : 'Abrir Sistema de Arquivos',
      description: isFileSystemOpen ? 'Fechar a sidebar de arquivos' : 'Abrir a sidebar de arquivos virtuais',
      keywords: ['arquivos', 'files', 'filesystem', 'sistema de arquivos', 'file system'],
      action: () => setIsFileSystemOpen(!isFileSystemOpen),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
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
      <FileSystemSidebar
        pyodide={pyodide}
        loading={loading}
        isOpen={isFileSystemOpen}
        onToggle={() => setIsFileSystemOpen(!isFileSystemOpen)}
        onFileSelect={(path) => setEditingFilePath(path)}
      />
      <FileEditor
        pyodide={pyodide}
        loading={loading}
        filePath={editingFilePath}
        onClose={() => setEditingFilePath(null)}
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
                  <div className="flex h-[calc(100vh-12rem)] min-h-[600px] w-full">
                    {/* FileSystem Sidebar */}
                    {isFileSystemOpen && (
                      <div className="flex-shrink-0">
                        <FileSystemSidebar
                          pyodide={pyodide}
                          loading={loading}
                          isOpen={true}
                          onToggle={() => setIsFileSystemOpen(false)}
                          onFileSelect={(path) => setEditingFilePath(path)}
                        />
                      </div>
                    )}
                    <Group
                      orientation={layout === 'bottom' || layout === 'top' ? 'vertical' : 'horizontal'}
                      className="flex-1"
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
                                onInputSubmit={onInputSubmit}
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
                      onInputSubmit={onInputSubmit}
                    />
                  </div>
                </div>
                        </Panel>
                      </>
                    )}
                  </Group>
                  </div>
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

