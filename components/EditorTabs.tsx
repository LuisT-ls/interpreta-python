'use client'

import { EditorTab } from '@/hooks/useEditorTabs'
import { ExportMenu } from '@/components/ExportMenu'

interface EditorTabsProps {
  tabs: EditorTab[]
  activeTabId: string
  onTabClick: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onNewTab: () => void
  onImport?: () => void
  onExportCurrent?: () => void
  onExportAll?: () => void
  onShare?: () => void
}

export function EditorTabs({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onNewTab,
  onImport,
  onExportCurrent,
  onExportAll,
  onShare,
  fontSize = 14,
  onFontSizeChange
}: EditorTabsProps & {
  fontSize?: number
  onFontSizeChange?: (size: number) => void
}) {
  return (
    <div className="relative flex h-12 min-w-0 flex-shrink-0 items-center justify-between gap-1 overflow-hidden border-b border-gray-200 bg-gray-50 px-1.5 dark:border-gray-700 dark:bg-gray-800 sm:h-10 sm:px-2">
      <div className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-hidden">
        <div className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex h-full shrink-0 items-center gap-0.5 rounded-t-lg px-1 transition-colors sm:px-1.5 ${activeTabId === tab.id
                ? 'relative top-[1px] border border-b-0 border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
              }`}
            >
              <button
                type="button"
                onClick={() => onTabClick(tab.id)}
                aria-pressed={activeTabId === tab.id}
                className="flex min-h-9 min-w-0 items-center px-1 text-sm font-medium"
                title={tab.name}
              >
                <span className="max-w-[112px] truncate sm:max-w-[150px]">{tab.name}</span>
              </button>
              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={() => onTabClose(tab.id)}
                  className="inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded text-gray-500 opacity-70 transition-colors hover:bg-gray-200 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700"
                  aria-label={`Fechar ${tab.name}`}
                  title={`Fechar ${tab.name}`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onNewTab}
          className="ml-1 inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
          title="Nova aba"
          aria-label="Criar nova aba"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5 border-l border-gray-200 pl-1 dark:border-gray-700 sm:gap-2 sm:pl-2">
        {onFontSizeChange && (
          <div className="mr-0 flex shrink-0 items-center rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 sm:mr-1">
            <button
              onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
              className="min-h-9 min-w-8 border-r border-gray-200 px-1.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 sm:px-2"
              disabled={fontSize <= 10}
              title="Diminuir fonte"
              aria-label="Diminuir tamanho da fonte"
            >
              A-
            </button>
            <span className="min-w-6 select-none px-1 py-1 text-center text-xs text-gray-500 dark:text-gray-400 sm:min-w-[30px] sm:px-2">
              {fontSize}
            </span>
            <button
              onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
              className="min-h-9 min-w-8 px-1.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 sm:px-2"
              disabled={fontSize >= 24}
              title="Aumentar fonte"
              aria-label="Aumentar tamanho da fonte"
            >
              A+
            </button>
          </div>
        )}

        {onShare && (
          <button
            onClick={onShare}
            className="hidden min-h-9 min-w-8 shrink-0 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 min-[400px]:inline-flex sm:min-w-9"
            title="Compartilhar código"
            aria-label="Compartilhar código"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        )}
        {onImport && (
          <button
            onClick={onImport}
            className="hidden min-h-9 min-w-8 shrink-0 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 min-[400px]:inline-flex sm:min-w-9"
            title="Importar código"
            aria-label="Importar código"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </button>
        )}
        {tabs.length > 1 && onExportCurrent && onExportAll ? (
          <ExportMenu
            onExportCurrent={onExportCurrent}
            onExportAll={onExportAll}
            currentTabName={tabs.find(tab => tab.id === activeTabId)?.name || 'editor.py'}
            totalTabs={tabs.length}
          />
        ) : onExportCurrent ? (
          <button
            onClick={onExportCurrent}
            className="hidden min-h-9 min-w-8 shrink-0 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 min-[400px]:inline-flex sm:min-w-9"
            title="Exportar código"
            aria-label="Exportar código"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  )
}

