'use client'

import { useState, useEffect } from 'react'

export type LayoutType = 'bottom' | 'right' | 'left' | 'top'

const LAYOUT_STORAGE_KEY = 'python-interpreter-layout'
const DEFAULT_LAYOUT: LayoutType = 'right'

export function useLayout() {
  const [layout, setLayout] = useState<LayoutType>(DEFAULT_LAYOUT)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Carregar layout salvo do localStorage
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY) as LayoutType | null
    if (savedLayout && ['bottom', 'right', 'left', 'top'].includes(savedLayout)) {
      setLayout(savedLayout)
    }
    setIsMounted(true)
  }, [])

  const changeLayout = (newLayout: LayoutType) => {
    setLayout(newLayout)
    localStorage.setItem(LAYOUT_STORAGE_KEY, newLayout)
  }

  return { layout, changeLayout, isMounted }
}

