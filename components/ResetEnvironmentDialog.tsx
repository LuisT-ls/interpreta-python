'use client'

import { useRef } from 'react'
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog'

interface ResetEnvironmentDialogProps {
  isOpen: boolean
  isBusy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ResetEnvironmentDialog({ isOpen, isBusy, onCancel, onConfirm }: ResetEnvironmentDialogProps) {
  const dialogRef = useRef<HTMLElement>(null)
  useAccessibleDialog(isOpen, onCancel, dialogRef)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => { if (!isBusy && event.target === event.currentTarget) onCancel() }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-environment-title"
        aria-describedby="reset-environment-description"
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:p-6"
      >
        <h2 id="reset-environment-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Reiniciar ambiente Python?
        </h2>
        <p id="reset-environment-description" className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
          Isso cria um novo runtime Pyodide. Variáveis, imports e pacotes da sessão atual serão removidos. O código, histórico e arquivos salvos do projeto serão mantidos; os pacotes precisarão ser instalados novamente.
        </p>
        <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button
            data-dialog-initial-focus
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            {isBusy ? 'Salvando arquivos…' : 'Reiniciar ambiente'}
          </button>
        </div>
      </section>
    </div>
  )
}
