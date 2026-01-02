/**
 * Utilitário de logging condicional
 * Remove logs de debug em produção para melhorar performance e segurança
 */

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Logger com métodos condicionais baseados no ambiente
 */
export const logger = {
  /**
   * Log apenas em desenvolvimento
   * Use para informações de debug que não são necessárias em produção
   */
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  /**
   * Debug apenas em desenvolvimento
   * Use para informações detalhadas de debug
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },

  /**
   * Warning sempre logado (útil para avisos importantes)
   * Use para situações que precisam de atenção mas não são erros
   */
  warn: (...args: unknown[]) => {
    console.warn(...args)
  },

  /**
   * Error sempre logado (crítico para debugging em produção)
   * Use para erros que precisam ser monitorados
   */
  error: (...args: unknown[]) => {
    console.error(...args)
  },
}
