'use client'

import { PythonEditor } from '@/components/PythonEditor'
import { MatplotlibPlot } from '@/components/MatplotlibPlot'
import type { NotebookCell } from '@/utils/workspaceDb'

interface NotebookEditorProps {
  cells: NotebookCell[]
  onChange: (cells: NotebookCell[]) => void
  onRunCell: (cellId: string, code: string) => void
  onSelectCell: (cellId: string) => void
  isExecuting: boolean
  isDisabled: boolean
  fontSize: number
}

export function NotebookEditor({ cells, onChange, onRunCell, onSelectCell, isExecuting, isDisabled, fontSize }: NotebookEditorProps) {
  const updateCell = (cellId: string, patch: Partial<NotebookCell>) => {
    onChange(cells.map((cell) => cell.id === cellId ? { ...cell, ...patch } : cell))
  }

  const moveCell = (index: number, delta: -1 | 1) => {
    const targetIndex = index + delta
    if (targetIndex < 0 || targetIndex >= cells.length) return
    const reordered = [...cells]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    onChange(reordered)
  }

  const addCell = (index = cells.length - 1) => {
    const next = [...cells]
    const cell: NotebookCell = { id: crypto.randomUUID(), code: '', output: '', hasError: false, plots: [] }
    next.splice(index + 1, 0, cell)
    onChange(next)
  }

  const removeCell = (cellId: string) => {
    if (cells.length <= 1) return
    onChange(cells.filter((cell) => cell.id !== cellId))
  }

  const duplicateCell = (index: number) => {
    const source = cells[index]
    if (!source) return
    const next = [...cells]
    next.splice(index + 1, 0, { ...source, id: crypto.randomUUID(), output: '', hasError: false, plots: [] })
    onChange(next)
  }

  return (
    <div className="h-full min-w-0 overflow-auto bg-gray-50 p-2 dark:bg-gray-950 sm:p-4" aria-label="Notebook Python">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Notebook Python</h2>
            <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">As variáveis permanecem disponíveis nas células seguintes deste projeto.</p>
          </div>
          <button type="button" onClick={() => addCell()} className="min-h-10 self-start rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:self-auto">+ Nova célula</button>
        </div>

        {cells.map((cell, index) => (
          <article key={cell.id} onFocusCapture={() => { if (!isExecuting) onSelectCell(cell.id) }} onClick={() => { if (!isExecuting) onSelectCell(cell.id) }} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-2 border-b border-gray-100 px-2 py-2 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Célula {index + 1}</span>
              <div className="flex flex-wrap items-center gap-1">
                <button type="button" aria-label={`Mover célula ${index + 1} para cima`} disabled={index === 0} onClick={() => moveCell(index, -1)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800">↑</button>
                <button type="button" aria-label={`Mover célula ${index + 1} para baixo`} disabled={index === cells.length - 1} onClick={() => moveCell(index, 1)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800">↓</button>
                <button type="button" aria-label={`Inserir célula após ${index + 1}`} onClick={() => addCell(index)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">＋</button>
                <button type="button" aria-label={`Duplicar célula ${index + 1}`} onClick={() => duplicateCell(index)} className="min-h-9 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">Duplicar</button>
                <button type="button" aria-label={`Excluir célula ${index + 1}`} disabled={cells.length <= 1} onClick={() => removeCell(cell.id)} className="min-h-9 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/40">Excluir</button>
                <button type="button" disabled={isDisabled || isExecuting} onClick={() => onRunCell(cell.id, cell.code)} className="min-h-9 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{isExecuting ? 'Executando…' : '▶ Executar célula'}</button>
              </div>
            </div>
            <div className="h-48 min-h-36 sm:h-44">
              <PythonEditor
                code={cell.code}
                onChange={(code) => updateCell(cell.id, { code })}
                disabled={isDisabled || isExecuting}
                fileName={`celula-${index + 1}.py`}
                errorLine={null}
                onRun={() => onRunCell(cell.id, cell.code)}
                fontSize={fontSize}
              />
            </div>
            {(cell.output || cell.plots.length > 0) && (
              <div role={cell.hasError ? 'alert' : undefined} aria-live={cell.hasError ? 'assertive' : 'off'} className={`border-t px-4 py-3 dark:border-gray-800 ${cell.hasError ? 'border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/20' : 'border-gray-100 bg-gray-50/80 dark:bg-gray-950/50'}`}>
                {cell.output && <pre className={`whitespace-pre-wrap break-words font-mono text-xs ${cell.hasError ? 'text-red-700 dark:text-red-300' : 'text-gray-800 dark:text-gray-200'}`}>{cell.output}</pre>}
                {cell.plots.map((plot) => <MatplotlibPlot key={plot.id} id={plot.id} imageData={plot.imageData} width={plot.width} height={plot.height} />)}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
