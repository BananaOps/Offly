import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart, faStar, faBug, faComments } from '@fortawesome/free-solid-svg-icons'

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto relative overflow-hidden transition-colors">
      <div className="absolute inset-0 bg-gradient-card opacity-50 dark:opacity-20"></div>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Made with love */}
          <div className="flex items-center gap-2 text-text dark:text-gray-300">
            <span>Made with</span>
            <FontAwesomeIcon icon={faHeart} className="text-accent animate-pulse" />
            <span>by the</span>
            <a 
              href="https://github.com/BananaOps" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              BananaOps
            </a>
            <span>community</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <a
              href="https://github.com/BananaOps/offly"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-primary transition-all hover:scale-105"
            >
              <FontAwesomeIcon icon={faStar} className="text-accent" />
              Star us on GitHub
            </a>
            <span className="text-gray-300">•</span>
            <a
              href="https://github.com/BananaOps/offly/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-secondary transition-all hover:scale-105"
            >
              <FontAwesomeIcon icon={faBug} className="text-secondary" />
              Report a Bug
            </a>
            <span className="text-gray-300">•</span>
            <a
              href="https://github.com/BananaOps/offly/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-primary transition-all hover:scale-105"
            >
              <FontAwesomeIcon icon={faComments} className="text-primary" />
              Join Discussion
            </a>
          </div>

          {/* License */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <a
              href="https://www.apache.org/licenses/LICENSE-2.0"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Apache 2.0 License
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
