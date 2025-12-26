type AuthConfig = { enabled: boolean; issuerUrl: string; clientId: string }
let RUNTIME_AUTH_CONFIG: AuthConfig = {
  enabled: false,
  issuerUrl: import.meta.env.VITE_AUTH_ISSUER_URL || '',
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID || '',
}

export function setAuthConfig(c: Partial<AuthConfig>) {
  RUNTIME_AUTH_CONFIG = { ...RUNTIME_AUTH_CONFIG, ...c }
}

export function getAuthConfig(): AuthConfig {
  return RUNTIME_AUTH_CONFIG
}

const REDIRECT_URI = (typeof window !== 'undefined' ? window.location.origin + '/' : 'http://localhost:3000/')

// Generate a random string for PKCE code verifier
function generateCodeVerifier(length = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  const array = new Uint32Array(length)
  if (typeof window !== 'undefined') {
    window.crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < length; i++) array[i] = Math.floor(Math.random() * 4294967295)
  }
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

function base64urlEncodeBytes(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function pkceChallengeFromVerifier(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return base64urlEncodeBytes(new Uint8Array(digest))
}

export async function startLogin(): Promise<void> {
  const { issuerUrl, clientId } = getAuthConfig()
  if (!issuerUrl || !clientId) throw new Error('SSO not configured')
  const codeVerifier = generateCodeVerifier(64)
  sessionStorage.setItem('pkce_code_verifier', codeVerifier)
  const codeChallenge = await pkceChallengeFromVerifier(codeVerifier)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email groups',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  window.location.href = `${issuerUrl}/auth?${params.toString()}`
}

export async function handleCallback(): Promise<boolean> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (!code) return false

  const verifier = sessionStorage.getItem('pkce_code_verifier') || ''
  if (!verifier) return false

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: getAuthConfig().clientId,
    code_verifier: verifier,
  })

  const resp = await fetch(`${getAuthConfig().issuerUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!resp.ok) return false
  const data = await resp.json()
  const idToken = data.id_token
  const accessToken = data.access_token
  if (!idToken) return false

  localStorage.setItem('id_token', idToken)
  if (accessToken) localStorage.setItem('access_token', accessToken)
  // Ensure user exists on backend
  try {
    await fetch('/api/v1/auth/ensure-user', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    })
  } catch (e) {
    // ignore
  }
  // Clean URL
  window.history.replaceState({}, document.title, window.location.origin + '/')
  return true
}

export function logout(): void {
  localStorage.removeItem('id_token')
  localStorage.removeItem('access_token')
  sessionStorage.removeItem('pkce_code_verifier')
  window.location.reload()
}

export function getIdToken(): string | null {
  return localStorage.getItem('id_token')
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
}

export interface DecodedToken {
  email?: string
  name?: string
  preferred_username?: string
  given_name?: string
  family_name?: string
  groups?: string[]
}

export function decodeIdToken(): DecodedToken | null {
  const token = getIdToken()
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    return payload
  } catch {
    return null
  }
}

export function getCurrentUser(): { name: string; email: string; role: string } | null {
  const decoded = decodeIdToken()
  if (!decoded) return null
  
  const email = decoded.email || ''
  let name = decoded.name || decoded.preferred_username || ''
  
  if (!name && (decoded.given_name || decoded.family_name)) {
    name = [decoded.given_name, decoded.family_name].filter(Boolean).join(' ')
  }
  if (!name) name = email
  
  // Determine role from groups
  const groups = decoded.groups || []
  const role = groups.includes('admin') ? 'admin' : 'user'
  
  return { name, email, role }
}
