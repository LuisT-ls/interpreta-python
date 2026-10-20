'use client'

import { useState, useCallback, useEffect } from 'react'
import { logger } from '@/utils/logger'
import { DEFAULT_STARTER_CODE, migrateStarterCode } from '@/utils/starterCode'

export interface MatplotlibPlot {
  id: string
  imageData: string // Base64 encoded PNG
  width: number
  height: number
  timestamp: number
}

export interface EditorTab {
  id: string
  name: string
  code: string
  output: string
  hasError: boolean
  plots: MatplotlibPlot[]
}

export function useEditorTabs() {
  // Inicialização preguiçosa para carregar do LocalStorage (apenas no cliente)
  const [tabs, setTabs] = useState<EditorTab[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTabs = localStorage.getItem('python-web-ide-tabs')
        if (savedTabs) {
          const parsed = JSON.parse(savedTabs)
          // Garantir que todas as abas tenham o campo plots
          return parsed.map((tab: EditorTab) => ({
            ...tab,
            code: migrateStarterCode(tab.code),
            plots: tab.plots || [],
          }))
        }
      } catch (e) {
        logger.error('Erro ao carregar abas do localStorage:', e)
      }
    }
    return [
      {
        id: '1',
        name: 'editor.py',
        code: DEFAULT_STARTER_CODE,
        output: '',
        hasError: false,
        plots: [],
      },
    ]
  })

  // Carregar aba ativa do LocalStorage
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedActiveId = localStorage.getItem('python-web-ide-active-tab')
        if (savedActiveId) {
          return savedActiveId
        }
      } catch (e) {
        logger.error('Erro ao carregar aba ativa do localStorage:', e)
      }
    }
    return '1'
  })

  // Persistir dados sempre que mudarem
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem('python-web-ide-tabs', JSON.stringify(tabs))
      } catch (e) {
        logger.error('Erro ao salvar abas no localStorage:', e)
      }
    }
  }, [tabs, isMounted])

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem('python-web-ide-active-tab', activeTabId)
      } catch (e) {
        logger.error('Erro ao salvar aba ativa no localStorage:', e)
      }
    }
  }, [activeTabId, isMounted])

  const createNewTab = useCallback(() => {
    const newId = Date.now().toString()
    const newTab: EditorTab = {
      id: newId,
      name: `editor_${tabs.length + 1}.py`,
      code: '',
      output: '',
      hasError: false,
      plots: [],
    }
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newId)
    return newId
  }, [tabs.length])

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((tab) => tab.id !== tabId)
      // Se fechar a aba ativa, ativar a primeira disponível
      if (activeTabId === tabId && filtered.length > 0) {
        setActiveTabId(filtered[0].id)
      }
      // Não permitir fechar se for a última aba
      return filtered.length > 0 ? filtered : prev
    })
  }, [activeTabId])

  const updateTabCode = useCallback((tabId: string, code: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, code } : tab))
    )
  }, [])

  const updateTabOutput = useCallback((tabId: string, output: string, hasError: boolean = false) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, output, hasError } : tab
      )
    )
  }, [])

  const addTabPlot = useCallback((tabId: string, plot: MatplotlibPlot) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, plots: [...tab.plots, plot] } : tab
      )
    )
  }, [])

  const clearTabPlots = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, plots: [] } : tab
      )
    )
  }, [])

  const replaceTabs = useCallback((nextTabs: EditorTab[], nextActiveTabId: string) => {
    const normalized = nextTabs.length > 0
      ? nextTabs.map((tab) => ({ ...tab, plots: tab.plots ?? [] }))
      : [{ id: Date.now().toString(), name: 'editor.py', code: '', output: '', hasError: false, plots: [] }]
    setTabs(normalized)
    setActiveTabId(normalized.some((tab) => tab.id === nextActiveTabId) ? nextActiveTabId : normalized[0].id)
  }, [])

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0]

  return {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    createNewTab,
    closeTab,
    updateTabCode,
    updateTabOutput,
    addTabPlot,
    clearTabPlots,
    replaceTabs,
  }
}

