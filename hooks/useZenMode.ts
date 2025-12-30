'use client'

import { useState, useEffect } from 'react'

const ZEN_MODE_STORAGE_KEY = 'python-interpreter-zen-mode'

export function useZenMode() {
  const [isZenMode, setIsZenMode] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Carregar preferência salva do localStorage
    const saved = localStorage.getItem(ZEN_MODE_STORAGE_KEY)
    if (saved === 'true') {
      setIsZenMode(true)
    }
    setIsMounted(true)
  }, [])

  const toggleZenMode = () => {
    const newValue = !isZenMode
    setIsZenMode(newValue)
    localStorage.setItem(ZEN_MODE_STORAGE_KEY, String(newValue))
  }

  const enterZenMode = () => {
    setIsZenMode(true)
    localStorage.setItem(ZEN_MODE_STORAGE_KEY, 'true')
  }

  const exitZenMode = () => {
    setIsZenMode(false)
    localStorage.setItem(ZEN_MODE_STORAGE_KEY, 'false')
  }

  return { isZenMode, toggleZenMode, enterZenMode, exitZenMode, isMounted }
}
