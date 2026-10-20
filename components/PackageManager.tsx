'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { usePackageManager, POPULAR_PACKAGES, AvailablePackage, InstalledPackage } from '@/hooks/usePackageManager'
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog'

interface PackageManagerProps {
  pyodide: any
  loading: boolean
  isOpen: boolean
  onClose: () => void
  onPackagesChanged?: (packages: string[]) => void
  onResetEnvironment: () => void
  isResettingEnvironment?: boolean
}

interface PyPIPackage {
  name: string
  version: string
  summary: string
  requiresPython: string | null
}

export function PackageManager({
  pyodide,
  loading,
  isOpen,
  onClose,
  onPackagesChanged,
  onResetEnvironment,
  isResettingEnvironment = false,
}: PackageManagerProps) {
  const {
    installedPackages,
    isLoading,
    isInstalling,
    error,
    installPackage,
    uninstallPackage,
    refreshInstalledPackages,
    checkPackageInstalled,
  } = usePackageManager({ pyodide, loading })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [installingPackage, setInstallingPackage] = useState<string | null>(null)
  const [pyPIPackage, setPyPIPackage] = useState<PyPIPackage | null>(null)
  const [isLookingUpPyPI, setIsLookingUpPyPI] = useState(false)
  const [pyPIError, setPyPIError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLElement>(null)
  useAccessibleDialog(isOpen, onClose, dialogRef)

  useEffect(() => {
    if (isOpen) onPackagesChanged?.(installedPackages.map((pkg) => pkg.name))
  }, [installedPackages, isOpen, onPackagesChanged])

  // Filtrar pacotes populares
  const filteredPackages = useMemo(() => {
    let filtered = POPULAR_PACKAGES

    // Filtrar por categoria
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((pkg) => pkg.category === selectedCategory)
    }

    // Filtrar por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(query) ||
          pkg.description?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [searchQuery, selectedCategory])

  // Obter categorias únicas
  const categories = useMemo(() => {
    const cats = new Set(POPULAR_PACKAGES.map((pkg) => pkg.category).filter((cat): cat is string => Boolean(cat)))
    return Array.from(cats).sort()
  }, [])

  const handleInstall = async (packageName: string) => {
    if (isResettingEnvironment) return
    setInstallingPackage(packageName)
    const success = await installPackage(packageName)
    if (success) {
      setInstallingPackage(null)
    } else {
      // Manter o estado de instalação para mostrar erro
      setTimeout(() => setInstallingPackage(null), 2000)
    }
  }

  const handleUninstall = async (packageName: string) => {
    await uninstallPackage(packageName)
  }

  const handlePyPILookup = async () => {
    const packageName = searchQuery.trim()
    if (!packageName || isLookingUpPyPI) return

    setIsLookingUpPyPI(true)
    setPyPIError(null)
    setPyPIPackage(null)
    try {
      const response = await fetch(`/api/pypi?name=${encodeURIComponent(packageName)}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Não foi possível consultar o PyPI.')
      setPyPIPackage(result as PyPIPackage)
    } catch (lookupError) {
      setPyPIError(lookupError instanceof Error ? lookupError.message : 'Não foi possível consultar o PyPI.')
    } finally {
      setIsLookingUpPyPI(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-manager-title"
        aria-describedby="package-manager-description"
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[94dvh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <div>
              <h2 id="package-manager-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Gerenciador de Pacotes
              </h2>
              <p id="package-manager-description" className="text-xs text-gray-500 dark:text-gray-400">
                Instale pacotes Python suportados pelo Pyodide.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onResetEnvironment}
            disabled={loading || isInstalling || isResettingEnvironment}
            title="Para remover pacotes carregados, reinicie o runtime Python. Isso remove todos os imports e variáveis da sessão."
            className="inline-flex shrink-0 rounded-md border border-amber-300 px-2 py-2 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 sm:px-3 sm:text-xs dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950/50"
          >
            {isResettingEnvironment ? 'Reiniciando…' : <><span className="sm:hidden">Reiniciar</span><span className="hidden sm:inline">Reiniciar ambiente</span></>}
          </button>
          <button
            onClick={onClose}
            className="rounded p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            title="Fechar"
            aria-label="Fechar gerenciador de pacotes"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div role="status" aria-live="polite" className="mx-4 mt-4 px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            {error}
          </div>
        )}

        {/* Search and filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                data-dialog-initial-focus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar pacotes..."
              aria-label="Filtrar pacotes populares e consultar um nome exato no PyPI"
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
            <button
              onClick={refreshInstalledPackages}
              disabled={isLoading}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              title="Atualizar lista"
              aria-label="Atualizar lista de pacotes instalados"
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-2 rounded-md bg-blue-50 p-3 text-xs leading-5 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100 sm:flex-row sm:items-center sm:justify-between" role="note">
            <p>A busca abaixo filtra a lista curada. Consulte um nome exato no PyPI; a existência no índice não garante compatibilidade com Pyodide.</p>
            <button
              type="button"
              onClick={handlePyPILookup}
              disabled={!searchQuery.trim() || isLookingUpPyPI || loading || isResettingEnvironment}
              className="shrink-0 rounded-md border border-blue-300 px-3 py-1.5 font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/60"
            >
              {isLookingUpPyPI ? 'Consultando PyPI…' : 'Consultar nome exato no PyPI'}
            </button>
          </div>
          {pyPIError && <p role="status" aria-live="polite" className="text-xs text-red-600 dark:text-red-400">{pyPIError}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400">Categoria:</span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Todas
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {pyPIPackage && (
            <section className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-900 dark:bg-indigo-950/30" aria-label="Resultado da consulta ao PyPI">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{pyPIPackage.name} <span className="font-normal text-gray-500">v{pyPIPackage.version}</span></h3>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{pyPIPackage.summary || 'Sem descrição publicada.'}</p>
                  {pyPIPackage.requiresPython && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Python {pyPIPackage.requiresPython}</p>}
                  <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">Compatibilidade Pyodide não verificada. A instalação pode falhar ou o pacote pode exigir extensões nativas incompatíveis.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInstall(pyPIPackage.name)}
                  disabled={checkPackageInstalled(pyPIPackage.name) || isInstalling || loading || isResettingEnvironment}
                  className="shrink-0 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {installingPackage === pyPIPackage.name ? 'Instalando…' : checkPackageInstalled(pyPIPackage.name) ? 'Instalado' : 'Tentar instalar'}
                </button>
              </div>
            </section>
          )}

          {/* Installed packages section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Pacotes Instalados ({installedPackages.length})
            </h3>
            {isLoading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Carregando...</div>
            ) : installedPackages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Nenhum pacote instalado foi detectado neste ambiente.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {installedPackages.map((pkg) => (
                  <div
                    key={pkg.name}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {pkg.name}
                      </div>
                      {pkg.version && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          v{pkg.version}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleUninstall(pkg.name)}
                      className="ml-2 rounded p-2 text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-400 dark:hover:bg-red-900/20"
                      title="Ocultar da lista (o pacote continua no ambiente)"
                      aria-label={`Ocultar ${pkg.name} da lista`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available packages section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Pacotes Disponíveis ({filteredPackages.length})
            </h3>
            {filteredPackages.length === 0 ? (
              <div role="status" className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Nenhum pacote encontrado
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredPackages.map((pkg) => {
                  const isInstalled = checkPackageInstalled(pkg.name)
                  const isInstallingThis = installingPackage === pkg.name

                  return (
                    <div
                      key={pkg.name}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {pkg.name}
                            </h4>
                            {isInstalled && (
                              <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                Instalado
                              </span>
                            )}
                          </div>
                          {pkg.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {pkg.description}
                            </p>
                          )}
                          {pkg.category && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                              {pkg.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleInstall(pkg.name)}
                        disabled={isInstalled || isInstallingThis || isInstalling}
                        className={`w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          isInstalled
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : isInstallingThis
                            ? 'bg-blue-400 dark:bg-blue-600 text-white cursor-wait'
                            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                        }`}
                      >
                        {isInstallingThis ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Instalando...
                          </span>
                        ) : isInstalled ? (
                          'Instalado'
                        ) : (
                          'Instalar'
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {installedPackages.length} pacote{installedPackages.length !== 1 ? 's' : ''} instalado{installedPackages.length !== 1 ? 's' : ''}
            </span>
            <span>Usando micropip do Pyodide</span>
          </div>
        </div>
      </section>
    </div>
  )
}

