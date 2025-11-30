'use client'

import { useEffect, useRef } from 'react'

interface InputDialogProps {
  isOpen: boolean
  prompt: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function InputDialog({ isOpen, prompt, onConfirm, onCancel }: InputDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = inputRef.current?.value || ''
    onConfirm(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Entrada do Usuário
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 whitespace-pre-wrap">
            {prompt}
          </p>
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o valor..."
              autoFocus
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

