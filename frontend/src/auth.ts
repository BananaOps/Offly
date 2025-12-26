type AuthConfig = { enabled: boolean; issuerUrl: string; clientId: string }
let RUNTIME_AUTH_CONFIG: AuthConfig = {
  enabled: false,
  issuerUrl: '',
  clientId: '',
}

export function setAuthConfig(c: Partial<AuthConfig>) {
  RUNTIME_AUTH_CONFIG = { ...RUNTIME_AUTH_CONFIG, ...c }
}

export function getAuthConfig(): AuthConfig {
  return RUNTIME_AUTH_CONFIG
}

// Start login by redirecting to Dex via backend
export async function startLogin(): Promise<void> {
  const { issuerUrl, clientId } = getAuthConfig()
  if (!issuerUrl || !clientId) throw new Error('SSO not configured')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: 'http://localhost:8080/api/v1/auth/callback',
    response_type: 'code',
    scope: 'openid profile email groups',
  })

  window.location.href = `${issuerUrl}/auth?${params.toString()}`
}

// Check if user just logged in (via query param from backend redirect)
export async function handleCallback(): Promise<boolean> {
  const url = new URL(window.location.href)
  const loggedIn = url.searchParams.get('logged_in')
  
  if (loggedIn === 'true') {
    // Clean URL
    window.history.replaceState({}, document.title, window.location.origin + '/')
    return true
  }
  
  return false
}

// Get current user info from backend
export async function getCurrentUser(): Promise<{ name: string; email: string; role: string } | null> {
  try {
    const resp = await fetch('/api/v1/auth/me', {
      credentials: 'include', // Send cookies
    })
    if (!resp.ok) {
      localStorage.removeItem('user_email')
      localStorage.removeItem('user_role')
      return null
    }
    const data = await resp.json()
    if (!data.authenticated) {
      localStorage.removeItem('user_email')
      localStorage.removeItem('user_role')
      return null
    }
    const user = {
      name: data.name || data.email,
      email: data.email,
      role: data.role || 'user',
    }
    // Cache email and role for instant display
    localStorage.setItem('user_email', data.email)
    localStorage.setItem('user_role', user.role)
    return user
  } catch {
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_role')
    return null
  }
}

// Get cached user email (instant, no network call)
export function getCachedUserEmail(): string | null {
  return localStorage.getItem('user_email')
}

// Check if current user is admin (instant, from cache)
export function isAdmin(): boolean {
  return localStorage.getItem('user_role') === 'admin'
}

// Logout by clearing backend cookie
export async function logout(): Promise<void> {
  try {
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // ignore
  }
  localStorage.removeItem('user_email')
  localStorage.removeItem('user_role')
  window.location.reload()
}
