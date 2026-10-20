import { Auth0Client } from '@auth0/nextjs-auth0/server'

let cachedAuth0Client: Auth0Client | null = null

export function getAppBaseUrl(): string | null {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, '')}`
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3000'
  return null
}

export function getAuth0Client(): Auth0Client | null {
  const domain = process.env.AUTH0_DOMAIN
  const clientId = process.env.AUTH0_CLIENT_ID
  const clientSecret = process.env.AUTH0_CLIENT_SECRET
  const secret = process.env.AUTH0_SECRET
  const appBaseUrl = getAppBaseUrl()

  if (!domain || !clientId || !clientSecret || !secret || !appBaseUrl) return null
  if (cachedAuth0Client) return cachedAuth0Client

  cachedAuth0Client = new Auth0Client({
    domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    clientId,
    clientSecret,
    secret,
    appBaseUrl,
  })

  return cachedAuth0Client
}
