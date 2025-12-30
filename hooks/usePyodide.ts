'use client'

import { useEffect, useState } from 'react'

interface EmscriptenFS {
  readdir: (path: string) => string[]
  writeFile: (path: string, data: string | Uint8Array, options?: { encoding?: string }) => void
  readFile: (path: string, options?: { encoding?: string }) => string | Uint8Array
  mkdir: (path: string, mode?: number) => void
  rmdir: (path: string) => void
  unlink: (path: string) => void
  stat: (path: string) => { mode: number; size: number; mtime: number }
  rename: (oldPath: string, newPath: string) => void
}

interface Pyodide {
  runPythonAsync: (code: string) => Promise<any>
  runPython: (code: string) => any
  setStdout: (options: { batched?: (text: string) => void; write?: (text: string) => void; raw?: boolean }) => void
  setStderr: (options: { batched?: (text: string) => void; write?: (text: string) => void; raw?: boolean }) => void
  globals: {
    set: (key: string, value: any) => void
    get: (key: string) => any
  }
  FS: EmscriptenFS
}

declare global {
  interface Window {
    loadPyodide: (config?: { indexURL?: string }) => Promise<Pyodide>
  }
}

export function usePyodide() {
  const [pyodide, setPyodide] = useState<Pyodide | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadPyodide() {
      try {
        // Carregar o script do Pyodide se ainda não estiver carregado
        if (!window.loadPyodide) {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js'
          script.async = true
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Falha ao carregar Pyodide'))
            document.head.appendChild(script)
          })
        }

        // Aguardar um pouco para garantir que o script foi processado
        await new Promise(resolve => setTimeout(resolve, 100))

        if (!mounted) return

        const py = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/',
        })

        if (mounted) {
          setPyodide(py)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar Pyodide')
          setLoading(false)
        }
      }
    }

    loadPyodide()

    return () => {
      mounted = false
    }
  }, [])

  return { pyodide, loading, error }
}

