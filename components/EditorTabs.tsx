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
    <div className="flex items-center justify-between gap-1 px-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-10 overflow-hidden flex-shrink-0 z-10 relative">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar h-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className={`
              flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap
              ${activeTabId === tab.id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-t border-l border-r border-gray-200 dark:border-gray-700 relative top-[1px]'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <span className="max-w-[150px] truncate">{tab.name}</span>
            {tabs.length > 1 && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose(tab.id)
                }}
                className="ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer opacity-60 hover:opacity-100"
                role="button"
                tabIndex={0}
                aria-label={`Fechar ${tab.name}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </button>
        ))}
        <button
          onClick={onNewTab}
          className="ml-1 p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Nova aba"
          aria-label="Criar nova aba"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700 ml-auto">
        {onFontSizeChange && (
          <div className="flex items-center bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 mr-2">
            <button
              onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-r border-gray-200 dark:border-gray-700 disabled:opacity-50"
              disabled={fontSize <= 10}
              title="Diminuir fonte"
            >
              A-
            </button>
            <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 min-w-[30px] text-center select-none">
              {fontSize}
            </span>
            <button
              onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              disabled={fontSize >= 24}
              title="Aumentar fonte"
            >
              A+
            </button>
          </div>
        )}

        {onShare && (
          <button
            onClick={onShare}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
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
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
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
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
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

