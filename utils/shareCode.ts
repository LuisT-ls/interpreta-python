import pako from 'pako'

/**
 * Codifica código Python para uma string base64 comprimida
 * Usa compressão gzip para reduzir o tamanho da URL
 */
export function encodeCode(code: string): string {
  try {
    // Converter string para Uint8Array
    const encoder = new TextEncoder()
    const data = encoder.encode(code)
    
    // Comprimir o código usando deflate (gzip)
    const compressed = pako.deflate(data)
    
    // Converter para base64
    const binaryString = String.fromCharCode(...compressed)
    const base64 = btoa(binaryString)
    
    // Codificar para URL-safe (substituir caracteres problemáticos)
    return encodeURIComponent(base64)
  } catch (error) {
    console.error('Erro ao codificar código:', error)
    // Fallback: usar apenas base64 sem compressão
    return encodeURIComponent(btoa(unescape(encodeURIComponent(code))))
  }
}

/**
 * Decodifica uma string base64 comprimida de volta para código Python
 */
export function decodeCode(encoded: string): string | null {
  try {
    // Decodificar URL-safe
    const base64 = decodeURIComponent(encoded)
    
    // Converter base64 para Uint8Array
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // Tentar descomprimir
    try {
      const decompressed = pako.inflate(bytes)
      // Converter Uint8Array de volta para string
      const decoder = new TextDecoder()
      return decoder.decode(decompressed)
    } catch {
      // Se falhar, tentar decodificar como base64 simples (fallback)
      try {
        return decodeURIComponent(escape(atob(base64)))
      } catch {
        return null
      }
    }
  } catch (error) {
    console.error('Erro ao decodificar código:', error)
    return null
  }
}

/**
 * Gera uma URL compartilhável com o código codificado
 */
export function generateShareUrl(code: string, baseUrl?: string): string {
  const encoded = encodeCode(code)
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '')
  return `${url}?code=${encoded}`
}

/**
 * Extrai código da URL atual (se existir)
 */
export function getCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('code')
  
  if (!encoded) return null
  
  return decodeCode(encoded)
}
