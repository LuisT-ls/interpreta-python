'use client'

import { useRef, useState } from 'react'
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog'

export interface LearningLesson {
  id: string
  level: 'Iniciante' | 'Fundamentos'
  title: string
  objective: string
  instructions: string
  hint: string
  starterCode: string
  expectedOutput: string
}

export const LEARNING_LESSONS: LearningLesson[] = [
  {
    id: 'hello-python', level: 'Iniciante', title: 'Seu primeiro programa',
    objective: 'Entenda como enviar uma mensagem para o terminal.',
    instructions: 'Execute o exemplo. Depois, troque a mensagem e execute novamente.',
    hint: 'A função print() mostra um valor no terminal.',
    starterCode: 'print("Olá, Python!")', expectedOutput: 'Olá, Python!',
  },
  {
    id: 'variables', level: 'Iniciante', title: 'Variáveis e texto',
    objective: 'Guarde um valor e use-o em uma mensagem.',
    instructions: 'Altere o nome para “Codex” e faça o programa exibir “Olá, Codex!”.',
    hint: 'Uma variável recebe um valor com o operador =. f-strings aceitam valores entre chaves.',
    starterCode: 'nome = "Seu nome"\nprint(f"Olá, {nome}!")', expectedOutput: 'Olá, Codex!',
  },
  {
    id: 'conditionals', level: 'Fundamentos', title: 'Decisões com if',
    objective: 'Faça o programa escolher uma resposta com base em uma condição.',
    instructions: 'Mude a nota para 8 e execute para receber “Aprovado”.',
    hint: 'A condição pode comparar a nota com 7 usando >=.',
    starterCode: 'nota = 0\nif nota >= 7:\n    print("Aprovado")\nelse:\n    print("Continue praticando")', expectedOutput: 'Aprovado',
  },
  {
    id: 'loops', level: 'Fundamentos', title: 'Repetição com for',
    objective: 'Some os valores produzidos por um laço.',
    instructions: 'Execute e observe como o acumulador muda a cada repetição.',
    hint: 'range(1, 6) percorre os números de 1 até 5.',
    starterCode: 'total = 0\nfor numero in range(1, 6):\n    total += numero\nprint(total)', expectedOutput: '15',
  },
  {
    id: 'functions', level: 'Fundamentos', title: 'Crie uma função',
    objective: 'Reutilize uma operação por meio de uma função.',
    instructions: 'Execute a função e depois experimente chamar dobro() com outro número.',
    hint: 'Use return para devolver o resultado calculado.',
    starterCode: 'def dobro(numero):\n    return numero * 2\n\nprint(dobro(12))', expectedOutput: '24',
  },
]

interface LearningPathModalProps {
  isOpen: boolean
  isBusy: boolean
  completedLessons: string[]
  onClose: () => void
  onOpenLesson: (lesson: LearningLesson) => void
}

export function LearningPathModal({ isOpen, isBusy, completedLessons, onClose, onOpenLesson }: LearningPathModalProps) {
  const [visibleHint, setVisibleHint] = useState<string | null>(null)
  const dialogRef = useRef<HTMLElement>(null)
  useAccessibleDialog(isOpen, onClose, dialogRef)
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="learning-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-gray-700 dark:bg-gray-900">
        <header className="flex items-start justify-between border-b border-gray-200 p-5 dark:border-gray-800">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Aprenda Python praticando</p><h2 id="learning-title" className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">Trilha guiada</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{completedLessons.length} de {LEARNING_LESSONS.length} desafios concluídos neste projeto</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Fechar trilha">✕</button>
        </header>
        <div className="overflow-y-auto p-4 sm:p-5">
          <ol className="space-y-3">
            {LEARNING_LESSONS.map((lesson, index) => {
              const completed = completedLessons.includes(lesson.id)
              return (
                <li key={lesson.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${completed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'}`}>{completed ? '✓' : index + 1}</span>
                      <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-gray-900 dark:text-gray-100">{lesson.title}</h3><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">{lesson.level}</span></div><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{lesson.objective}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{lesson.instructions}</p></div>
                    </div>
                    <button type="button" disabled={isBusy} onClick={() => onOpenLesson(lesson)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{completed ? 'Praticar novamente' : 'Abrir desafio'}</button>
                  </div>
                  <div className="mt-3 pl-11">
                    <button type="button" onClick={() => setVisibleHint(visibleHint === lesson.id ? null : lesson.id)} className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-300">{visibleHint === lesson.id ? 'Ocultar dica' : 'Ver dica'}</button>
                    {visibleHint === lesson.id && <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{lesson.hint}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </section>
    </div>
  )
}
