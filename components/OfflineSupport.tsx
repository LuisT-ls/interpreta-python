'use client'

import { useEffect, useState } from 'react'

const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/'
const PYODIDE_CORE_FILES = [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
]

export function OfflineSupport() {
  const [isOnline, setIsOnline] = useState(true)
  const [prepareState, setPrepareState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [prepareMessage, setPrepareMessage] = useState('')

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine)
    updateOnlineState()
    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error: unknown) => {
        console.warn('Não foi possível habilitar o cache offline.', error)
      })
    }

    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  }, [])

  const prepareOffline = async () => {
    if (process.env.NODE_ENV !== 'production') {
      setPrepareState('error')
      setPrepareMessage('A preparação offline está disponível na versão implantada.')
      return
    }
    if (!navigator.onLine) {
      setPrepareState('error')
      setPrepareMessage('Conecte-se à internet para baixar os recursos essenciais.')
      return
    }

    setPrepareState('loading')
    setPrepareMessage('Baixando arquivos essenciais do Pyodide…')
    try {
      if (!('serviceWorker' in navigator) || !('caches' in window)) {
        throw new Error('Este navegador não oferece suporte ao cache offline necessário.')
      }
      await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      const cache = await caches.open('interpreta-python-pyodide-0.26.1-v1')
      for (const file of PYODIDE_CORE_FILES) {
        const url = `${PYODIDE_BASE}${file}`
        const response = await fetch(url, { cache: 'reload' })
        if (!response.ok) throw new Error(`Não foi possível baixar ${file}.`)
        await cache.put(url, response.clone())
        await response.body?.cancel()
      }
      setPrepareState('ready')
      setPrepareMessage('Base do Python pronta para uso offline. Pacotes extras precisam ser instalados enquanto houver internet.')
    } catch (error) {
      setPrepareState('error')
      setPrepareMessage(error instanceof Error ? error.message : 'Não foi possível preparar o cache offline.')
    }
  }

  if (isOnline) {
    return (
      <div className="fixed bottom-3 left-3 z-[70] flex max-w-[calc(100vw-1.5rem)] flex-col items-start gap-1 sm:bottom-4 sm:left-4">
        <button
          type="button"
          onClick={() => void prepareOffline()}
          disabled={prepareState === 'loading'}
          title="Baixar os arquivos essenciais do Pyodide para permitir inicialização offline"
          className="rounded-full border border-gray-300 bg-white/95 px-3 py-2 text-xs font-semibold text-gray-700 shadow-lg backdrop-blur transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {prepareState === 'loading' ? 'Preparando offline…' : prepareState === 'ready' ? 'Base offline pronta' : 'Preparar offline'}
        </button>
        {prepareMessage && (
          <p role="status" aria-live="polite" className={`max-w-sm rounded-lg px-3 py-2 text-xs shadow-lg ${prepareState === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200' : 'bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200'}`}>
            {prepareMessage}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className="sticky top-0 z-[70] border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 sm:text-sm"
      role="status"
      aria-live="polite"
    >
      Sem conexão. O editor e os recursos baixados podem continuar disponíveis; preparar o Pyodide ou instalar pacotes novos exige internet.
    </div>
  )
}
