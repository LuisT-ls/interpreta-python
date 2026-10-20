'use client'

interface PersistenceNoticeProps {
  onExport: () => void
}

export function PersistenceNotice({ onExport }: PersistenceNoticeProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between" role="status">
      <div className="flex items-start gap-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.3 4.6L2.9 17a2 2 0 001.7 3h14.8a2 2 0 001.7-3L13.7 4.6a2 2 0 00-3.4 0z" />
        </svg>
        <div>
          <p className="font-semibold">Seu código é salvo neste navegador.</p>
          <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">Arquivos virtuais e pacotes instalados são temporários e serão perdidos ao recarregar a página.</p>
        </div>
      </div>
      <button type="button" onClick={onExport} className="whitespace-nowrap rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50">
        Exportar código atual
      </button>
    </div>
  )
}
