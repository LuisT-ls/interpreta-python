'use client'

import { useState, useCallback, useEffect } from 'react'

export interface EditorTab {
  id: string
  name: string
  code: string
  output: string
  hasError: boolean
}

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

export function useEditorTabs() {
  // Inicialização preguiçosa para carregar do LocalStorage (apenas no cliente)
  const [tabs, setTabs] = useState<EditorTab[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTabs = localStorage.getItem('python-web-ide-tabs')
        if (savedTabs) {
          return JSON.parse(savedTabs)
        }
      } catch (e) {
        console.error('Erro ao carregar abas do localStorage:', e)
      }
    }
    return [
      {
        id: '1',
        name: 'editor.py',
        code: DEFAULT_CODE,
        output: '',
        hasError: false,
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
        console.error('Erro ao carregar aba ativa do localStorage:', e)
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
        console.error('Erro ao salvar abas no localStorage:', e)
      }
    }
  }, [tabs, isMounted])

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem('python-web-ide-active-tab', activeTabId)
      } catch (e) {
        console.error('Erro ao salvar aba ativa no localStorage:', e)
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
  }
}

