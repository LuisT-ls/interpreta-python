'use client'

interface PersistenceNoticeProps {
  onExport: () => void
}

export function PersistenceNotice({ onExport }: PersistenceNoticeProps) {
  return (
    <aside className="flex flex-col gap-2 rounded-lg border border-blue-200/70 bg-blue-50/60 px-3 py-2.5 text-sm text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-100 sm:flex-row sm:items-center sm:justify-between" aria-label="Como seus dados são salvos">
      <div className="flex min-w-0 items-start gap-2.5">
        <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="9" strokeWidth={2} />
          <path strokeLinecap="round" strokeWidth={2} d="M12 11v5m0-8h.01" />
        </svg>
        <div className="min-w-0">
          <p className="font-semibold">Salvo neste navegador</p>
          <p className="text-xs leading-relaxed text-blue-800 dark:text-blue-200">Código e projeto são salvos localmente; os arquivos do workspace têm backup automático. Ao recarregar, o Python reinicia: variáveis e pacotes carregados não persistem. Limpar os dados do navegador remove os backups.</p>
        </div>
      </div>
      <button type="button" onClick={onExport} className="whitespace-nowrap self-start rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100 dark:hover:bg-blue-900/50 sm:self-center">
        Baixar código atual
      </button>
    </aside>
  )
}
