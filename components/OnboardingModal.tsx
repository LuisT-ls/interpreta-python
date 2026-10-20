'use client'

import { useRef } from 'react'
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog'

interface OnboardingExample {
  id: string
  title: string
  description: string
  code: string
  icon: string
}

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectExample: (code: string) => void
}

const EXAMPLES: OnboardingExample[] = [
  {
    id: 'hello',
    title: 'Primeiro programa',
    description: 'Veja uma saída simples no terminal.',
    icon: '🐍',
    code: 'nome = "Python"\nprint(f"Olá, {nome}!")',
  },
  {
    id: 'input',
    title: 'Interagir com input()',
    description: 'Digite um valor e receba uma resposta.',
    icon: '⌨️',
    code: 'nome = input("Qual é o seu nome? ")\nprint(f"Prazer em conhecer você, {nome}!")',
  },
  {
    id: 'plot',
    title: 'Criar um gráfico',
    description: 'Renderize um gráfico com matplotlib.',
    icon: '📊',
    code: 'import matplotlib.pyplot as plt\n\nvalores = [1, 4, 2, 5, 3]\nplt.plot(valores)\nplt.title("Meu primeiro gráfico")\nplt.show()',
  },
]

export function OnboardingModal({ isOpen, onClose, onSelectExample }: OnboardingModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useAccessibleDialog(isOpen, onClose, dialogRef)
  if (!isOpen) return null

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Comece por aqui</p>
            <h2 id="onboarding-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">Execute Python direto no navegador</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Escolha um exemplo para entender o fluxo principal ou continue com o editor atual.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Fechar introdução"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid gap-3 p-6 md:grid-cols-3">
          {EXAMPLES.map((example) => (
            <button
              type="button"
              key={example.id}
              onClick={() => onSelectExample(example.code)}
              className="group rounded-xl border border-gray-200 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:hover:border-blue-500"
            >
              <span className="text-2xl" aria-hidden="true">{example.icon}</span>
              <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">{example.title}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{example.description}</p>
              <span className="mt-4 inline-flex text-sm font-medium text-blue-600 dark:text-blue-400">Usar exemplo →</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Dica: use Ctrl + Enter ou Cmd + Enter para executar.</p>
          <button type="button" onClick={onClose} className="text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-300 dark:hover:text-white">
            Continuar com o editor
          </button>
        </div>
      </div>
    </div>
  )
}
