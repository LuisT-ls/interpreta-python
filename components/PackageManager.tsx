'use client'

import { useState, useMemo } from 'react'
import { usePackageManager, POPULAR_PACKAGES, AvailablePackage, InstalledPackage } from '@/hooks/usePackageManager'

interface PackageManagerProps {
  pyodide: any
  loading: boolean
  isOpen: boolean
  onClose: () => void
}

export function PackageManager({
  pyodide,
  loading,
  isOpen,
  onClose,
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

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Gerenciador de Pacotes
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Instale pacotes Python suportados pelo Pyodide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Fechar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 mt-4 px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
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
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar pacotes..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
            <button
              onClick={refreshInstalledPackages}
              disabled={isLoading}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              title="Atualizar lista"
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
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
          {/* Installed packages section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Pacotes Instalados ({installedPackages.length})
            </h3>
            {isLoading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Carregando...</div>
            ) : installedPackages.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Nenhum pacote instalado
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
                      className="ml-2 p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Remover"
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
              <div className="text-sm text-gray-500 dark:text-gray-400">
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
      </div>
    </div>
  )
}

