'use client'

import type { ToastMessage } from '@/hooks/useToast'

interface ToastViewportProps {
  toast: ToastMessage | null
  onDismiss: () => void
}

export function ToastViewport({ toast, onDismiss }: ToastViewportProps) {
  if (!toast) return null

  const isError = toast.variant === 'error'

  return (
    <div
      className={`fixed bottom-4 right-4 z-[100] flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-xl sm:bottom-6 sm:right-6 sm:max-w-md ${
        isError
          ? 'border-red-800 bg-red-950 text-red-100'
          : 'border-emerald-700 bg-emerald-700 text-white'
      }`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <span className="min-w-0 flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="-mr-1 rounded p-1 text-current/80 hover:bg-white/10 hover:text-current focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Dispensar notificação"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  )
}
