export default function Logo({ className = "h-8", iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto"
      >
        {/* Fond du calendrier avec gradient */}
        <defs>
          <linearGradient id="calendarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6C4DFF" />
            <stop offset="50%" stopColor="#FF6FB5" />
            <stop offset="100%" stopColor="#2ED1D1" />
          </linearGradient>
          <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6C4DFF" />
            <stop offset="100%" stopColor="#2ED1D1" />
          </linearGradient>
        </defs>

        {/* Corps du calendrier */}
        <rect
          x="6"
          y="10"
          width="36"
          height="32"
          rx="4"
          fill="url(#calendarGradient)"
          opacity="0.1"
        />
        <rect
          x="6"
          y="10"
          width="36"
          height="32"
          rx="4"
          stroke="url(#calendarGradient)"
          strokeWidth="2"
        />

        {/* En-tête du calendrier */}
        <rect
          x="6"
          y="10"
          width="36"
          height="10"
          rx="4"
          fill="url(#headerGradient)"
        />
        <rect
          x="6"
          y="10"
          width="36"
          height="10"
          fill="url(#headerGradient)"
          opacity="0.8"
        />

        {/* Anneaux de suspension */}
        <rect x="14" y="6" width="3" height="8" rx="1.5" fill="#6C4DFF" />
        <rect x="31" y="6" width="3" height="8" rx="1.5" fill="#2ED1D1" />

        {/* Grille de dates */}
        <g opacity="0.8">
          {/* Ligne 1 */}
          <circle cx="12" cy="26" r="1.5" fill="#6C4DFF" />
          <circle cx="18" cy="26" r="1.5" fill="#6C4DFF" />
          <circle cx="24" cy="26" r="1.5" fill="#FF6FB5" />
          <circle cx="30" cy="26" r="1.5" fill="#2ED1D1" />
          <circle cx="36" cy="26" r="1.5" fill="#2ED1D1" />

          {/* Ligne 2 */}
          <circle cx="12" cy="32" r="1.5" fill="#6C4DFF" />
          <circle cx="18" cy="32" r="1.5" fill="#FF6FB5" />
          <circle cx="24" cy="32" r="1.5" fill="#FF6FB5" />
          <circle cx="30" cy="32" r="1.5" fill="#2ED1D1" />
          <circle cx="36" cy="32" r="1.5" fill="#2ED1D1" />

          {/* Ligne 3 */}
          <circle cx="12" cy="38" r="1.5" fill="#6C4DFF" />
          <circle cx="18" cy="38" r="1.5" fill="#6C4DFF" />
          <circle cx="24" cy="38" r="1.5" fill="#FF6FB5" />
          <circle cx="30" cy="38" r="1.5" fill="#2ED1D1" />
          <circle cx="36" cy="38" r="1.5" fill="#2ED1D1" />
        </g>

        {/* Checkmark stylisé (pour "off") */}
        <path
          d="M20 30 L22 32 L28 26"
          stroke="#FF6FB5"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.9"
        />
      </svg>

      {!iconOnly && (
        <div className="flex flex-col">
          <span className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent leading-none">
            Offly
          </span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider leading-none mt-0.5">
            Time Off Manager
          </span>
        </div>
      )}
    </div>
  )
}

export function LogoIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="calendarGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6C4DFF" />
          <stop offset="50%" stopColor="#FF6FB5" />
          <stop offset="100%" stopColor="#2ED1D1" />
        </linearGradient>
        <linearGradient id="headerGradientIcon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6C4DFF" />
          <stop offset="100%" stopColor="#2ED1D1" />
        </linearGradient>
      </defs>

      <rect
        x="6"
        y="10"
        width="36"
        height="32"
        rx="4"
        fill="url(#calendarGradientIcon)"
        opacity="0.1"
      />
      <rect
        x="6"
        y="10"
        width="36"
        height="32"
        rx="4"
        stroke="url(#calendarGradientIcon)"
        strokeWidth="2"
      />

      <rect
        x="6"
        y="10"
        width="36"
        height="10"
        rx="4"
        fill="url(#headerGradientIcon)"
      />

      <rect x="14" y="6" width="3" height="8" rx="1.5" fill="#6C4DFF" />
      <rect x="31" y="6" width="3" height="8" rx="1.5" fill="#2ED1D1" />

      <g opacity="0.8">
        <circle cx="12" cy="26" r="1.5" fill="#6C4DFF" />
        <circle cx="18" cy="26" r="1.5" fill="#6C4DFF" />
        <circle cx="24" cy="26" r="1.5" fill="#FF6FB5" />
        <circle cx="30" cy="26" r="1.5" fill="#2ED1D1" />
        <circle cx="36" cy="26" r="1.5" fill="#2ED1D1" />

        <circle cx="12" cy="32" r="1.5" fill="#6C4DFF" />
        <circle cx="18" cy="32" r="1.5" fill="#FF6FB5" />
        <circle cx="24" cy="32" r="1.5" fill="#FF6FB5" />
        <circle cx="30" cy="32" r="1.5" fill="#2ED1D1" />
        <circle cx="36" cy="32" r="1.5" fill="#2ED1D1" />

        <circle cx="12" cy="38" r="1.5" fill="#6C4DFF" />
        <circle cx="18" cy="38" r="1.5" fill="#6C4DFF" />
        <circle cx="24" cy="38" r="1.5" fill="#FF6FB5" />
        <circle cx="30" cy="38" r="1.5" fill="#2ED1D1" />
        <circle cx="36" cy="38" r="1.5" fill="#2ED1D1" />
      </g>

      <path
        d="M20 30 L22 32 L28 26"
        stroke="#FF6FB5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.9"
      />
    </svg>
  )
}

