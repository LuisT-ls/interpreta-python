/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 16 usa Turbopack por padrão (mais rápido que Webpack)
  // Para usar Webpack, adicione a flag --webpack ao executar npm run dev
  
  // Configuração do Turbopack (vazia para silenciar o warning)
  turbopack: {},
  
  // Otimizações para desenvolvimento
  experimental: {
    // Evitar problemas de chunk loading no Turbopack
    optimizePackageImports: ['react-resizable-panels'],
  },

  // Headers de segurança
  async headers() {
    return [
      {
        // Aplicar a todos os caminhos
        source: '/:path*',
        headers: [
          // Content Security Policy
          // Nota: Pyodide requer 'unsafe-eval' e 'unsafe-inline' para funcionar
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://cdn.jsdelivr.net https://pypi.org https://files.pythonhosted.org",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // X-Content-Type-Options: Previne MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // X-Frame-Options: Previne clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // X-XSS-Protection: Proteção XSS (legado, mas ainda útil)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer-Policy: Controla informações de referrer
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions-Policy: Controla recursos do navegador
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'interest-cohort=()',
            ].join(', '),
          },
          // Strict-Transport-Security: Força HTTPS (apenas em produção)
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ]
  },
}

module.exports = nextConfig

