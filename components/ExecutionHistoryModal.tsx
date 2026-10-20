'use client'

import { useMemo, useRef, useState } from 'react'
import { MatplotlibPlot } from '@/components/MatplotlibPlot'
import type { ExecutionRun } from '@/utils/workspaceDb'
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog'

interface ExecutionHistoryModalProps {
  isOpen: boolean
  isBusy: boolean
  runs: ExecutionRun[]
  onClose: () => void
  onRestoreCode: (run: ExecutionRun) => void
}

export function ExecutionHistoryModal({ isOpen, isBusy, runs, onClose, onRestoreCode }: ExecutionHistoryModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const dialogRef = useRef<HTMLElement>(null)
  const selectedRuns = useMemo(() => selectedIds.map((id) => runs.find((run) => run.id === id)).filter((run): run is ExecutionRun => Boolean(run)), [selectedIds, runs])
  useAccessibleDialog(isOpen, onClose, dialogRef)
  if (!isOpen) return null

  const toggleCompare = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current.slice(-1), id])
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="history-title" className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-gray-700 dark:bg-gray-900">
        <header className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800">
          <div><h2 id="history-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">Histórico de execuções</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Últimas {runs.length} execuções deste projeto — limite de 30 versões.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Fechar histórico">✕</button>
        </header>
        {selectedRuns.length === 2 && (
          <div className="grid gap-3 border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950 md:grid-cols-2">
            {selectedRuns.map((run) => <div key={run.id} className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"><p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">{new Date(run.createdAt).toLocaleString()}</p><pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-gray-800 dark:text-gray-200">{run.output}</pre></div>)}
          </div>
        )}
        <div className="overflow-y-auto p-4">
          {runs.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">As próximas execuções aparecerão aqui.</div> : (
            <ul className="space-y-3">
              {runs.map((run) => (
                <li key={run.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${run.hasError ? 'bg-red-500' : 'bg-emerald-500'}`} /><span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{run.tabName}</span><time className="text-xs text-gray-500 dark:text-gray-400">{new Date(run.createdAt).toLocaleString()}</time></div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300"><input type="checkbox" checked={selectedIds.includes(run.id)} onChange={() => toggleCompare(run.id)} aria-label={`Comparar execução de ${new Date(run.createdAt).toLocaleString()}`} />Comparar</label>
                      <button type="button" disabled={isBusy} onClick={() => onRestoreCode(run)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Restaurar código</button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <pre className="max-h-32 overflow-auto rounded-lg bg-gray-950 p-3 whitespace-pre-wrap break-words font-mono text-xs text-gray-100">{run.code}</pre>
                    <pre className={`max-h-32 overflow-auto rounded-lg p-3 whitespace-pre-wrap break-words font-mono text-xs ${run.hasError ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200' : 'bg-gray-50 text-gray-800 dark:bg-gray-950 dark:text-gray-200'}`}>{run.output}</pre>
                  </div>
                  {run.plots.map((plot) => <MatplotlibPlot key={plot.id} id={`history-${run.id}-${plot.id}`} imageData={plot.imageData} width={plot.width} height={plot.height} />)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
