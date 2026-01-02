'use client'

interface LoadingProgressProps {
  progress: number
  stage: string
  message?: string
  showSpinner?: boolean
}

/**
 * Componente de progresso visual melhorado
 */
export function LoadingProgress({
  progress,
  stage,
  message,
  showSpinner = true,
}: LoadingProgressProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
      {showSpinner && (
        <div className="relative">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {/* Progress ring */}
          <svg
            className="absolute inset-0 h-12 w-12 transform -rotate-90"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="text-blue-200 dark:text-blue-900"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 10}`}
              strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress / 100)}`}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.3s ease-out',
              }}
            />
          </svg>
        </div>
      )}

      <div className="w-full max-w-xs space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">{stage}</span>
          <span className="text-gray-500 dark:text-gray-400 font-mono">
            {Math.round(progress)}%
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
            style={{
              width: `${Math.max(progress, 5)}%`,
            }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>

        {message && (
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
