'use client'

import { useRef } from 'react'
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog'

interface ResetWorkspaceDialogProps {
  isOpen: boolean
  isBusy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ResetWorkspaceDialog({ isOpen, isBusy, onCancel, onConfirm }: ResetWorkspaceDialogProps) {
  const dialogRef = useRef<HTMLElement>(null)
  useAccessibleDialog(isOpen, onCancel, dialogRef)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => { if (!isBusy && event.target === event.currentTarget) onCancel() }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-workspace-title"
        aria-describedby="reset-workspace-description"
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:p-6"
      >
        <h2 id="reset-workspace-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Limpar workspace deste projeto?
        </h2>
        <p id="reset-workspace-description" className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
          Esta ação apaga as abas e células, saídas, histórico, progresso da trilha e arquivos virtuais do projeto. Não pode ser desfeita. Os pacotes já carregados no ambiente Python permanecem disponíveis.
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
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            {isBusy ? 'Limpando…' : 'Limpar workspace'}
          </button>
        </div>
      </section>
    </div>
  )
}
