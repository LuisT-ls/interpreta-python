import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const siteUrl = 'https://icti-python.vercel.app'
const siteName = 'Interpretador Python Web'
const description = 'Execute código Python diretamente no navegador usando Pyodide (WebAssembly). Editor completo com syntax highlighting, múltiplas abas, validação em tempo real e suporte a input(). Sem necessidade de backend ou servidor.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `${siteName} | %s`,
  },
  description,
  keywords: [
    'python',
    'interpretador python',
    'python online',
    'executar python no navegador',
    'pyodide',
    'python web',
    'python editor',
    'python compiler',
    'python interpreter',
    'webassembly',
    'python 3.12',
    'editor python',
    'executar código python',
    'python sandbox',
    'python playground',
    'python ide',
    'python code editor',
    'python no browser',
    'python wasm',
  ],
  authors: [
    {
      name: 'Luis Teixeira',
      url: 'https://luistls.vercel.app',
    },
  ],
  creator: 'Luis Teixeira',
  publisher: 'Luis Teixeira',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/favicon/apple-touch-icon.png',
    shortcut: '/favicon/favicon.ico',
  },
  manifest: '/favicon/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName,
    title: siteName,
    description,
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Interpretador Python Web - Execute código Python no navegador',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description,
    images: ['/logo.png'],
    creator: '@LuisT-ls',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Adicione suas verificações aqui se necessário
    // google: 'seu-codigo-google',
    // yandex: 'seu-codigo-yandex',
    // bing: 'seu-codigo-bing',
  },
  alternates: {
    canonical: siteUrl,
  },
  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteName,
    description,
    url: siteUrl,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: 'Luis Teixeira',
      url: 'https://luistls.vercel.app',
      sameAs: [
        'https://github.com/LuisT-ls',
        'https://www.linkedin.com/in/luis-tei',
      ],
    },
    codeRepository: 'https://github.com/LuisT-ls/interpreta-python',
    license: 'https://github.com/LuisT-ls/interpreta-python/blob/main/LICENSE',
    programmingLanguage: 'Python',
    runtimePlatform: 'Pyodide',
    featureList: [
      'Syntax highlighting',
      'Validação em tempo real',
      'Múltiplas abas',
      'Suporte a input()',
      'Exportar/Importar código',
      'Dark mode',
      'Layout customizável',
    ],
  }

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}

