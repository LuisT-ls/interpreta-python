'use client'

import { useCallback, useRef } from 'react'
import { logger } from '@/utils/logger'

interface UseMatplotlibOptions {
  pyodide: any
  loading: boolean
}

interface PlotData {
  id: string
  canvas: HTMLCanvasElement
  timestamp: number
}

/**
 * Hook para gerenciar matplotlib no Pyodide
 * Configura matplotlib para renderizar em canvas HTML
 */
export function useMatplotlib({ pyodide, loading }: UseMatplotlibOptions) {
  const plotIdCounterRef = useRef(0)
  const plotsRef = useRef<PlotData[]>([])

  /**
   * Inicializa matplotlib no Pyodide
   */
  const initializeMatplotlib = useCallback(async () => {
    if (!pyodide || loading) return false

    try {
      // Verificar se matplotlib já está instalado
      try {
        pyodide.runPython('import matplotlib')
      } catch {
        // Instalar matplotlib se não estiver disponível
        await pyodide.loadPackage('matplotlib')
      }

      // Configurar matplotlib para usar backend que renderiza em canvas
      pyodide.runPython(`
import matplotlib
matplotlib.use('module://matplotlib.backends.wasm_backend')
import matplotlib.pyplot as plt
import io
import base64

# Criar função para renderizar gráfico em canvas
def render_plot_to_canvas():
    """Renderiza o gráfico atual em um canvas e retorna o elemento canvas"""
    import js
    from matplotlib.backends.backend_agg import FigureCanvasAgg
    
    fig = plt.gcf()
    if fig is None:
        return None
    
    # Criar canvas HTML
    canvas_id = f"matplotlib-plot-{js.plot_id_counter}"
    js.plot_id_counter += 1
    
    # Renderizar figura em buffer
    canvas_agg = FigureCanvasAgg(fig)
    buf = io.BytesIO()
    canvas_agg.print_png(buf)
    buf.seek(0)
    
    # Converter para base64
    img_data = base64.b64encode(buf.read()).decode('utf-8')
    
    # Criar elemento canvas via JS
    canvas = js.document.createElement('canvas')
    canvas.id = canvas_id
    canvas.width = int(fig.get_figwidth() * fig.dpi)
    canvas.height = int(fig.get_figheight() * fig.dpi)
    
    # Carregar imagem no canvas
    img = js.Image.new()
    img.src = f"data:image/png;base64,{img_data}"
    
    def onload():
        ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        js.plt_show_callback(canvas_id, canvas)
    
    img.onload = onload
    
    # Limpar figura para próxima plotagem
    plt.clf()
    
    return canvas_id

# Substituir plt.show() para usar nossa função
_original_show = plt.show
def custom_show(*args, **kwargs):
    render_plot_to_canvas()
    _original_show(*args, **kwargs)

plt.show = custom_show

# Expor função globalmente
import builtins
builtins.render_plot_to_canvas = render_plot_to_canvas
      `)

      // Expor contador de plots para Python
      if (!(window as any).plot_id_counter) {
        (window as any).plot_id_counter = 0
      }

      return true
    } catch (error) {
      logger.error('Erro ao inicializar matplotlib:', error)
      return false
    }
  }, [pyodide, loading])

  /**
   * Versão simplificada usando o backend wasm do matplotlib
   */
  const initializeMatplotlibSimple = useCallback(async () => {
    if (!pyodide || loading) return false

    try {
      // Carregar matplotlib
      try {
        pyodide.runPython('import matplotlib')
      } catch {
        await pyodide.loadPackage('matplotlib')
      }

      // Configurar matplotlib para usar backend wasm
      pyodide.runPython(`
import matplotlib
matplotlib.use('module://matplotlib.backends.wasm_backend')
import matplotlib.pyplot as plt

# Criar função para capturar gráfico
def show_plot():
    """Captura o gráfico atual e retorna como canvas"""
    import js
    from matplotlib.backends.backend_agg import FigureCanvasAgg
    import io
    import base64
    
    fig = plt.gcf()
    if fig is None or len(fig.axes) == 0:
        return None
    
    # Renderizar em buffer
    canvas_agg = FigureCanvasAgg(fig)
    buf = io.BytesIO()
    canvas_agg.print_png(buf)
    buf.seek(0)
    
    # Converter para base64
    img_data = base64.b64encode(buf.read()).decode('utf-8')
    
    # Criar ID único
    plot_id = f"plot_{js.plot_id_counter}"
    js.plot_id_counter += 1
    
    # Chamar callback JS para criar canvas
    js.create_matplotlib_canvas(plot_id, img_data, int(fig.get_figwidth() * fig.dpi), int(fig.get_figheight() * fig.dpi))
    
    # Limpar figura
    plt.clf()
    
    return plot_id

# Substituir plt.show()
_original_show = plt.show
def custom_show(*args, **kwargs):
    show_plot()
    # Não chamar _original_show para evitar popup

plt.show = custom_show
      `)

      // Inicializar contador
      if (!(window as any).plot_id_counter) {
        (window as any).plot_id_counter = 0
      }

      return true
    } catch (error) {
      logger.error('Erro ao inicializar matplotlib:', error)
      return false
    }
  }, [pyodide, loading])

  /**
   * Adiciona um plot à lista
   */
  const addPlot = useCallback((canvas: HTMLCanvasElement) => {
    const plotId = `plot-${plotIdCounterRef.current++}`
    plotsRef.current.push({
      id: plotId,
      canvas,
      timestamp: Date.now(),
    })
    return plotId
  }, [])

  /**
   * Limpa todos os plots
   */
  const clearPlots = useCallback(() => {
    plotsRef.current = []
    plotIdCounterRef.current = 0
  }, [])

  /**
   * Obtém todos os plots
   */
  const getPlots = useCallback(() => {
    return plotsRef.current
  }, [])

  return {
    initializeMatplotlib: initializeMatplotlibSimple,
    addPlot,
    clearPlots,
    getPlots,
  }
}

