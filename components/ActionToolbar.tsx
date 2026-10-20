'use client'

import type { ReactNode } from 'react'

interface ActionToolbarProps {
  onRun: () => void
  onStop: () => void
  onNewTab: () => void
  onImport: () => void
  onExport: () => void
  onShare: () => void
  onOpenCloud: () => void
  onToggleFiles: () => void
  onOpenPackages: () => void
  onOpenCommandPalette: () => void
  isExecuting: boolean
  isDisabled: boolean
  isFileSystemOpen: boolean
}

interface ToolbarButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'danger' | 'secondary'
  icon: ReactNode
  pressed?: boolean
  controls?: string
  compact?: boolean
  keepLabel?: boolean
}

function ToolbarButton({
  label,
  onClick,
  disabled = false,
  variant = 'secondary',
  icon,
  pressed,
  controls,
  compact = false,
  keepLabel = false,
}: ToolbarButtonProps) {
  const styles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    secondary: 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:ring-blue-500',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      aria-controls={controls}
      className={`inline-flex items-center justify-center gap-2 rounded-lg ${compact ? 'px-2.5' : 'px-3'} py-2 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
      title={label}
    >
      {icon}
      <span className={compact ? 'sr-only' : keepLabel ? 'whitespace-nowrap' : 'hidden md:inline'}>{label}</span>
    </button>
  )
}

export function ActionToolbar({
  onRun,
  onStop,
  onNewTab,
  onImport,
  onExport,
  onShare,
  onOpenCloud,
  onToggleFiles,
  onOpenPackages,
  onOpenCommandPalette,
  isExecuting,
  isDisabled,
  isFileSystemOpen,
}: ActionToolbarProps) {
  return (
    <div
      role="group"
      aria-label="Ações principais do editor"
      className="flex flex-wrap items-center justify-start gap-2 border-t border-gray-200 bg-gray-50/70 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950/20 xl:flex-nowrap"
    >
      <ToolbarButton
        label={isExecuting ? 'Executando...' : 'Executar'}
        onClick={onRun}
        disabled={isDisabled || isExecuting}
        variant="primary"
        keepLabel
        icon={isExecuting ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v14l11-7L8 5z" />
          </svg>
        )}
      />

      {isExecuting && (
        <ToolbarButton
          label="Parar"
          onClick={onStop}
          variant="danger"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
              <path strokeLinecap="round" strokeWidth={2} d="M9 9h6v6H9z" />
            </svg>
          }
        />
      )}

      <span className="mx-1 hidden h-6 w-px bg-gray-300 sm:block dark:bg-gray-700" aria-hidden="true" />

      <ToolbarButton
        label="Nova aba"
        onClick={onNewTab}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
          </svg>
        }
      />
      <ToolbarButton
        label="Importar código"
        onClick={onImport}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0L8 8m4-4l4 4M5 20h14" />
          </svg>
        }
      />
      <ToolbarButton
        label="Exportar código"
        onClick={onExport}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l4-4m-4 4l-4-4M5 20h14" />
          </svg>
        }
      />
      <span className="mx-1 hidden h-6 w-px bg-gray-300 sm:block dark:bg-gray-700" aria-hidden="true" />
      <ToolbarButton
        label={isFileSystemOpen ? 'Fechar arquivos' : 'Arquivos'}
        onClick={onToggleFiles}
        pressed={isFileSystemOpen}
        controls="virtual-files-sidebar"
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
        }
      />
      <ToolbarButton
        label="Pacotes"
        onClick={onOpenPackages}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l8 4-8 4-8-4 8-4zm-8 9l8 4 8-4M4 16l8 4 8-4" />
          </svg>
        }
      />
      <ToolbarButton
        label="Compartilhar"
        onClick={onShare}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <circle cx="18" cy="5" r="2" strokeWidth={2} />
            <circle cx="6" cy="12" r="2" strokeWidth={2} />
            <circle cx="18" cy="19" r="2" strokeWidth={2} />
            <path strokeLinecap="round" strokeWidth={2} d="M8 11l8-5M8 13l8 5" />
          </svg>
        }
      />
      <ToolbarButton
        label="Conta e nuvem"
        onClick={onOpenCloud}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 18a4 4 0 01-.5-7.97A5.5 5.5 0 0117 8a4 4 0 01.5 7.97M12 12v9m0 0l-3-3m3 3l3-3" />
          </svg>
        }
      />
      <ToolbarButton
        label="Mais ações"
        onClick={onOpenCommandPalette}
        compact
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="19" cy="12" r="1.5" fill="currentColor" />
          </svg>
        }
      />
    </div>
  )
}
