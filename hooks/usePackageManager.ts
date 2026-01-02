'use client'

import { useState, useCallback, useEffect } from 'react'
import { logger } from '@/utils/logger'

export interface InstalledPackage {
  name: string
  version?: string
}

export interface AvailablePackage {
  name: string
  description?: string
  category?: string
}

interface UsePackageManagerOptions {
  pyodide: any
  loading: boolean
}

interface UsePackageManagerReturn {
  installedPackages: InstalledPackage[]
  isLoading: boolean
  isInstalling: boolean
  error: string | null
  installPackage: (packageName: string) => Promise<boolean>
  uninstallPackage: (packageName: string) => Promise<boolean>
  refreshInstalledPackages: () => Promise<void>
  checkPackageInstalled: (packageName: string) => boolean
}

/**
 * Lista de pacotes populares suportados pelo Pyodide
 */
export const POPULAR_PACKAGES: AvailablePackage[] = [
  { name: 'pandas', description: 'Data analysis and manipulation library', category: 'Data Science' },
  { name: 'numpy', description: 'Fundamental package for scientific computing', category: 'Data Science' },
  { name: 'matplotlib', description: 'Plotting library for Python', category: 'Visualization' },
  { name: 'scipy', description: 'Scientific computing library', category: 'Data Science' },
  { name: 'scikit-learn', description: 'Machine learning library', category: 'Machine Learning' },
  { name: 'pillow', description: 'Image processing library', category: 'Image Processing' },
  { name: 'requests', description: 'HTTP library for Python', category: 'Networking' },
  { name: 'beautifulsoup4', description: 'HTML/XML parser', category: 'Web Scraping' },
  { name: 'lxml', description: 'XML and HTML processing', category: 'Web Scraping' },
  { name: 'pyyaml', description: 'YAML parser and emitter', category: 'Data Formats' },
  { name: 'jsonschema', description: 'JSON Schema validation', category: 'Data Formats' },
  { name: 'networkx', description: 'Graph and network analysis', category: 'Data Science' },
  { name: 'sympy', description: 'Symbolic mathematics library', category: 'Mathematics' },
  { name: 'statsmodels', description: 'Statistical modeling', category: 'Data Science' },
  { name: 'seaborn', description: 'Statistical data visualization', category: 'Visualization' },
  { name: 'plotly', description: 'Interactive plotting library', category: 'Visualization' },
  { name: 'bokeh', description: 'Interactive visualization library', category: 'Visualization' },
  { name: 'pytest', description: 'Testing framework', category: 'Testing' },
  { name: 'black', description: 'Code formatter', category: 'Development' },
  { name: 'flake8', description: 'Linter for Python', category: 'Development' },
]

/**
 * Hook para gerenciar pacotes Python usando micropip do Pyodide
 */
export function usePackageManager({
  pyodide,
  loading,
}: UsePackageManagerOptions): UsePackageManagerReturn {
  const [installedPackages, setInstalledPackages] = useState<InstalledPackage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Lista pacotes instalados
   */
  const refreshInstalledPackages = useCallback(async () => {
    if (!pyodide || loading) return

    setIsLoading(true)
    setError(null)

    try {
      // Listar pacotes instalados
      // Primeiro, tentar carregar micropip para verificar pacotes instalados
      try {
        await pyodide.loadPackage('micropip')
      } catch {
        // micropip pode já estar carregado ou não estar disponível
      }

      const result = pyodide.runPython(`
import json
import sys

packages = []

# Método 1: Tentar usar micropip.list() se disponível
try:
    import micropip
    installed = micropip.list()
    for pkg_name in installed:
        try:
            # Tentar obter versão do pacote
            module = __import__(pkg_name)
            version = getattr(module, '__version__', 'installed')
            packages.append({"name": pkg_name, "version": str(version)})
        except:
            packages.append({"name": pkg_name, "version": "installed"})
except:
    pass

# Método 2: Verificar pacotes conhecidos que podem estar instalados
known_packages = [
    "numpy", "pandas", "matplotlib", "scipy", "scikit-learn",
    "pillow", "requests", "beautifulsoup4", "lxml", "pyyaml",
    "jsonschema", "networkx", "sympy", "statsmodels", "seaborn",
    "plotly", "bokeh", "pytest", "black", "flake8"
]

for pkg_name in known_packages:
    try:
        module = __import__(pkg_name)
        version = getattr(module, '__version__', 'installed')
        # Adicionar apenas se não estiver na lista
        if not any(p["name"] == pkg_name for p in packages):
            packages.append({"name": pkg_name, "version": str(version)})
    except ImportError:
        pass

json.dumps(packages)
      `)

      try {
        const packages = JSON.parse(result)
        setInstalledPackages(packages || [])
      } catch {
        // Se não conseguir parsear, tentar método alternativo
        const packages = pyodide.runPython(`
import sys
import json

packages = []
# Listar módulos importáveis
for name in sys.modules.keys():
    if '.' not in name and name not in ['sys', 'builtins', '__main__']:
        try:
            module = __import__(name)
            version = getattr(module, '__version__', 'unknown')
            packages.append({"name": name, "version": version})
        except:
            pass

json.dumps(packages[:50])  # Limitar a 50 para não sobrecarregar
        `)
        
        try {
          const parsed = JSON.parse(packages)
          setInstalledPackages(parsed || [])
        } catch {
          // Se ainda falhar, usar lista vazia
          setInstalledPackages([])
        }
      }
    } catch (err) {
      logger.error('Erro ao listar pacotes:', err)
      setError(err instanceof Error ? err.message : 'Erro ao listar pacotes')
      setInstalledPackages([])
    } finally {
      setIsLoading(false)
    }
  }, [pyodide, loading])

  /**
   * Instala um pacote usando micropip
   */
  const installPackage = useCallback(async (packageName: string): Promise<boolean> => {
    if (!pyodide || loading || isInstalling) return false

    setIsInstalling(true)
    setError(null)

    try {
      // Carregar micropip se ainda não estiver carregado
      await pyodide.loadPackage('micropip')

      // Instalar pacote
      await pyodide.runPythonAsync(`
import micropip
await micropip.install('${packageName}')
      `)

      // Atualizar lista de pacotes instalados
      await refreshInstalledPackages()
      
      return true
    } catch (err: any) {
      logger.error('Erro ao instalar pacote:', err)
      const errorMessage = err?.message || err?.toString() || 'Erro desconhecido ao instalar pacote'
      setError(errorMessage)
      return false
    } finally {
      setIsInstalling(false)
    }
  }, [pyodide, loading, isInstalling, refreshInstalledPackages])

  /**
   * Remove um pacote (não suportado diretamente pelo micropip, mas podemos tentar)
   */
  const uninstallPackage = useCallback(async (packageName: string): Promise<boolean> => {
    if (!pyodide || loading) return false

    setError(null)

    try {
      // Nota: micropip não suporta desinstalação direta
      // Podemos apenas remover da lista visual
      // Em uma implementação real, seria necessário reinicializar o Pyodide
      
      setInstalledPackages((prev) => prev.filter((pkg) => pkg.name !== packageName))
      
      // Mostrar aviso ao usuário
      setError(`Pacote ${packageName} removido da lista. Para remover completamente, recarregue a página.`)
      
      return true
    } catch (err: any) {
      logger.error('Erro ao remover pacote:', err)
      setError(err?.message || 'Erro ao remover pacote')
      return false
    }
  }, [pyodide, loading])

  /**
   * Verifica se um pacote está instalado
   */
  const checkPackageInstalled = useCallback((packageName: string): boolean => {
    return installedPackages.some(
      (pkg) => pkg.name.toLowerCase() === packageName.toLowerCase()
    )
  }, [installedPackages])

  // Carregar lista de pacotes quando pyodide estiver pronto
  useEffect(() => {
    if (pyodide && !loading) {
      refreshInstalledPackages()
    }
  }, [pyodide, loading, refreshInstalledPackages])

  return {
    installedPackages,
    isLoading,
    isInstalling,
    error,
    installPackage,
    uninstallPackage,
    refreshInstalledPackages,
    checkPackageInstalled,
  }
}

