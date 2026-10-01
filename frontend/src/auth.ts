type AuthConfig = { enabled: boolean; issuerUrl: string; clientId: string; loginUrl: string }
let RUNTIME_AUTH_CONFIG: AuthConfig = {
  enabled: false,
  issuerUrl: '',
  clientId: '',
  loginUrl: '/api/v1/auth/login',
}

export function setAuthConfig(c: Partial<AuthConfig>) {
  RUNTIME_AUTH_CONFIG = { ...RUNTIME_AUTH_CONFIG, ...c }
}

export function getAuthConfig(): AuthConfig {
  return RUNTIME_AUTH_CONFIG
}

// Start login: the backend builds the provider authorization request (discovered
// endpoint, configured redirect URI and scopes, state/nonce/PKCE) and redirects.
export async function startLogin(): Promise<void> {
  const { enabled, loginUrl } = getAuthConfig()
  if (!enabled) throw new Error('SSO not configured')
  window.location.href = loginUrl || '/api/v1/auth/login'
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
