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
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('Inicializando...')

  useEffect(() => {
    let mounted = true

    async function loadPyodide() {
      try {
        setStage('Carregando script do Pyodide...')
        setProgress(10)

        // Carregar o script do Pyodide se ainda não estiver carregado
        if (!window.loadPyodide) {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js'
          script.async = true
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => {
              setProgress(30)
              resolve()
            }
            script.onerror = () => reject(new Error('Falha ao carregar Pyodide'))
            document.head.appendChild(script)
          })
        } else {
          setProgress(30)
        }

        // Aguardar um pouco para garantir que o script foi processado
        setStage('Processando script...')
        setProgress(40)
        await new Promise(resolve => setTimeout(resolve, 100))

        if (!mounted) return

        setStage('Inicializando Pyodide...')
        setProgress(50)

        // Simular progresso durante o carregamento
        const progressInterval = setInterval(() => {
          if (!mounted) {
            clearInterval(progressInterval)
            return
          }
          setProgress((prev) => {
            // Aumentar progresso gradualmente até 90%
            if (prev < 90) {
              return Math.min(prev + 2, 90)
            }
            return prev
          })
        }, 200)

        const py = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/',
        })

        clearInterval(progressInterval)

        if (mounted) {
          setStage('Finalizando...')
          setProgress(100)
          
          // Pequeno delay para mostrar 100%
          await new Promise(resolve => setTimeout(resolve, 300))
          
          setPyodide(py)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar Pyodide')
          setLoading(false)
          setProgress(0)
        }
      }
    }

    loadPyodide()

    return () => {
      mounted = false
    }
  }, [])

  return { pyodide, loading, error, progress, stage }
}

