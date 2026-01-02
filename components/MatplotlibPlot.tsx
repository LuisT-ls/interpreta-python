'use client'

import { useEffect, useRef } from 'react'
import { logger } from '@/utils/logger'

interface MatplotlibPlotProps {
  imageData: string // Base64 encoded PNG
  width: number
  height: number
  id: string
}

/**
 * Componente para renderizar gráficos matplotlib
 */
export function MatplotlibPlot({ imageData, width, height, id }: MatplotlibPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !imageData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Criar imagem a partir dos dados base64
    const img = new Image()
    img.onload = () => {
      // Ajustar tamanho do canvas se necessário
      canvas.width = width || img.width
      canvas.height = height || img.height
      
      // Desenhar imagem no canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.onerror = (error) => {
      logger.error('Erro ao carregar imagem do gráfico:', error)
    }
    img.src = `data:image/png;base64,${imageData}`
  }, [imageData, width, height])

  return (
    <div className="my-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <canvas
        ref={canvasRef}
        id={id}
        className="max-w-full h-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  )
}

