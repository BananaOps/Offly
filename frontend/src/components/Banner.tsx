import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart, faXmark } from '@fortawesome/free-solid-svg-icons'
import { faGithub } from '@fortawesome/free-brands-svg-icons'

export default function Banner() {
  const [isVisible, setIsVisible] = useState(() => {
    // Vérifier si l'utilisateur a déjà fermé la bannière
    return localStorage.getItem('openSourceBannerDismissed') !== 'true'
  })

  const handleDismiss = () => {
    localStorage.setItem('openSourceBannerDismissed', 'true')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="bg-gradient-to-r from-primary via-accent to-secondary text-white animate-gradient">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3 flex-1">
            <FontAwesomeIcon icon={faGithub} className="text-xl flex-shrink-0" />
            <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
              <span>This is an open source project!</span>
              <span className="hidden sm:inline flex items-center gap-1">
                Star us on GitHub
                <FontAwesomeIcon icon={faHeart} className="text-white animate-pulse" />
              </span>
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <a
              href="https://github.com/BananaOps/offly"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-1.5 bg-white text-primary rounded-lg text-sm font-medium hover:bg-opacity-90 hover:shadow-lg transition-all shadow-md"
            >
              <FontAwesomeIcon icon={faGithub} className="mr-2" />
              View on GitHub
            </a>
            
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              aria-label="Dismiss banner"
            >
              <FontAwesomeIcon icon={faXmark} className="text-lg" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
