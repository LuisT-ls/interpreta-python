'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastVariant = 'success' | 'error'

export interface ToastMessage {
  id: number
  message: string
  variant: ToastVariant
}

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const nextId = useRef(0)

  const notify = useCallback((message: string, variant: ToastVariant = 'success') => {
    nextId.current += 1
    setToast({ id: nextId.current, message, variant })
  }, [])

  const dismiss = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => {
      setToast((current) => current?.id === toast.id ? null : current)
    }, toast.variant === 'error' ? 6000 : 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  return { toast, notify, dismiss }
}
