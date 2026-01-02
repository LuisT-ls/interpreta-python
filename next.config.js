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
}

module.exports = nextConfig

