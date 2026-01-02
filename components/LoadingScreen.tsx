'use client'

interface LoadingScreenProps {
  progress?: number
  stage?: string
}

// Valores fixos para evitar problemas de hidratação (Math.random() causa diferenças entre servidor e cliente)
const EDITOR_LINE_WIDTHS = [45, 72, 38, 65, 50, 58, 42, 68, 55, 48, 63, 52, 70, 45, 60]
const TERMINAL_LINE_WIDTHS = [85, 62, 78, 51, 67, 73, 59, 81]

/**
 * Componente de loading minimalista - apenas indicador de progresso
 */
export function LoadingScreen({ progress = 0, stage = 'Carregando Pyodide...' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex items-center justify-center">
      <div className="w-full max-w-xs px-4">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1.5">
          <span>{stage}</span>
          {progress > 0 && (
            <span className="text-gray-500 dark:text-gray-500 font-mono text-xs">
              {Math.round(progress)}%
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-blue-500 dark:bg-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${Math.max(progress, 5)}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton loader para o editor
 */
export function EditorSkeleton() {
  return (
    <div className="h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Tab bar skeleton */}
      <div className="h-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      
      {/* Editor content skeleton */}
      <div className="p-4 space-y-2">
        {EDITOR_LINE_WIDTHS.map((width, i) => (
          <div
            key={i}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse flex-shrink-0" />
            <div
              className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"
              style={{
                width: `${width}%`,
                animationDelay: `${i * 30}ms`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton loader para o terminal
 */
export function TerminalSkeleton() {
  return (
    <div className="h-full bg-black rounded-lg overflow-hidden border border-gray-800">
      {/* Terminal header skeleton */}
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-700 animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-gray-700 animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-gray-700 animate-pulse" />
        </div>
        <div className="h-3 w-16 bg-gray-800 rounded animate-pulse ml-2" />
      </div>
      
      {/* Terminal content skeleton */}
      <div className="p-4 space-y-2">
        {TERMINAL_LINE_WIDTHS.map((width, i) => (
          <div
            key={i}
            className="h-4 bg-gray-900 rounded animate-pulse"
            style={{
              width: `${width}%`,
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
