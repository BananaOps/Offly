import { useEffect, useState } from 'react'
import OfflyApp from './components/offly/OfflyApp'
import { getCurrentUser, handleCallback, setAuthConfig } from './auth'

/**
 * Coquille d'amorçage : elle résout la configuration SSO et absorbe le retour de
 * callback OIDC, puis laisse la main à l'interface décrite par
 * « Offly - Calendrier & saisie.dc.html ».
 */
function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/v1/auth/config')
        if (res.ok) {
          const cfg = await res.json()
          setAuthConfig({
            enabled: !!cfg.enabled,
            issuerUrl: cfg.issuerUrl || '',
            clientId: cfg.clientId || '',
          })
          if (cfg.enabled) await getCurrentUser()
        }
      } catch {
        // Sans configuration d'auth, l'application reste utilisable en mode ouvert.
      }
      await handleCallback()
      setReady(true)
    }
    init()
  }, [])

  if (!ready) return null
  return <OfflyApp />
}

export default App
