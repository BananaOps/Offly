import { useEffect, useRef, useState } from 'react'
import { Holiday, Team, User } from '../../types'
import {
  Coverage,
  PART_LABEL,
  PART_ORDER,
  Part,
  Placed,
  cellKey,
  countryFlag,
  coverageFor,
  holidayFor,
  initialsOf,
  longDate,
  parseDay,
  shortDow,
} from '../../lib/halfday'

export interface Group {
  id: string
  name: string
  members: User[]
}

interface Props {
  days: string[]
  today: string
  groups: Group[]
  teams: Team[]
  selectedTeam: string
  onSelectTeam: (id: string) => void
  absences: Map<string, Placed>
  holidays: Map<string, Holiday>
  threshold: number
  showCoverage: boolean
  peopleCount: number
  onCycle: (user: User, day: string) => void
  onSet: (user: User, day: string, part?: Part) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  canEdit: (user: User) => boolean
  currentUser?: User
}

interface Alert {
  teamName: string
  day: string
  coverage: Coverage
}

export default function CalendarScreen({
  days,
  today,
  groups,
  teams,
  selectedTeam,
  onSelectTeam,
  absences,
  holidays,
  threshold,
  showCoverage,
  peopleCount,
  onCycle,
  onSet,
  onPrev,
  onNext,
  onToday,
  canEdit,
  currentUser,
}: Props) {
  const [menu, setMenu] = useState<{ userId: string; day: string } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Un clic hors menu le referme — le menu est un chemin secondaire, il ne doit
  // jamais rester ouvert derrière une autre action.
  useEffect(() => {
    if (!menu) return
    const close = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-menu-root]')) setMenu(null)
    }
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onEsc)
    }
  }, [menu])

  const coverageByGroup = new Map<string, (Coverage | null)[]>()
  const alerts: Alert[] = []
  for (const group of groups) {
    const row = days.map(day => {
      const cov = coverageFor(group.members, day, absences, holidays, threshold)
      if (cov?.belowThreshold) alerts.push({ teamName: group.name, day, coverage: cov })
      return cov
    })
    coverageByGroup.set(group.id, row)
  }
  alerts.sort((a, b) => a.day.localeCompare(b.day))
  const firstAlert = alerts[0]

  const rangeLabel = days.length ? `${longDate(days[0])} → ${longDate(days[days.length - 1])}` : ''

  // « Poser une absence » a besoin de savoir pour qui. Hors SSO l'application
  // n'identifie personne : le bouton n'est alors pas rendu du tout, la saisie
  // passant par la grille.
  const canUseEntryButton = !!currentUser
  const openEntry = () => {
    if (!currentUser) return
    if (!days.includes(today)) onToday()
    setMenu({ userId: currentUser.id, day: today })
  }

  return (
    // minHeight:0 est indispensable : sans lui cet item flex ne peut pas rétrécir
    // sous la hauteur de son contenu, la grille déborde et le pied de légende
    // sort du cadre dès qu'il y a beaucoup d'équipes.
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '18px 22px 14px',
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="o-h1">Calendrier d'équipe</h1>
          <p className="o-sub">
            {rangeLabel} · {peopleCount} {peopleCount > 1 ? 'personnes' : 'personne'} · {groups.length}{' '}
            {groups.length > 1 ? 'équipes' : 'équipe'}
          </p>
        </div>
        <div className="o-navgroup">
          <button type="button" className="o-ghost" onClick={onPrev} aria-label="Période précédente">
            ‹
          </button>
          <button type="button" className="o-ghost" onClick={onToday}>
            Aujourd'hui
          </button>
          <button type="button" className="o-ghost" onClick={onNext} aria-label="Période suivante">
            ›
          </button>
        </div>
        {canUseEntryButton && (
          <button type="button" className="o-btn" onClick={openEntry} title="Ouvre la saisie sur aujourd'hui">
            Poser une absence
          </button>
        )}
      </div>

      {firstAlert && (
        <div className="o-alert" style={{ margin: '14px 22px 0' }}>
          <span className="o-alert__dot" />
          <span style={{ font: "500 12px 'IBM Plex Sans', sans-serif" }}>{firstAlert.teamName} sous le seuil</span>
          <span style={{ font: "400 12px 'IBM Plex Sans', sans-serif", color: '#8a6a7b' }}>
            {longDate(firstAlert.day)} — {firstAlert.coverage.minPercent}% de l'effectif présent
            {alerts.length > 1 && ` · ${alerts.length - 1} autre(s) créneau(x)`}
          </span>
        </div>
      )}

      <div style={{ padding: '16px 22px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="o-chip"
          aria-pressed={selectedTeam === 'all'}
          onClick={() => onSelectTeam('all')}
        >
          Toutes les équipes
        </button>
        {teams.map(team => (
          <button
            key={team.id}
            type="button"
            className="o-chip"
            aria-pressed={selectedTeam === team.id}
            onClick={() => onSelectTeam(team.id)}
          >
            {team.name}
          </button>
        ))}
      </div>

      <div ref={gridRef} style={{ padding: '0 22px 16px', flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div style={{ minWidth: 'var(--name-col)' }}>
          {/* En-tête collant : sur un planning long, savoir à quel jour correspond
              une colonne reste nécessaire après défilement. */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 5,
              background: 'var(--surface)',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 4,
              paddingLeft: 'var(--name-col)',
              paddingTop: 14,
              paddingBottom: 6,
            }}
          >
            {days.map(day => (
              <div key={day} style={{ flex: 1, textAlign: 'center', minWidth: 30 }}>
                <div className="o-label">{shortDow(day)}</div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 24,
                    height: 22,
                    marginTop: 2,
                    borderRadius: 11,
                    font: "500 12px 'IBM Plex Sans', sans-serif",
                    background: day === today ? 'var(--accent)' : 'transparent',
                    color: day === today ? '#fff' : 'var(--ink-2)',
                  }}
                >
                  {parseDay(day).getDate()}
                </div>
              </div>
            ))}
          </div>

          {groups.map(group => (
            <div key={group.id} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 7px' }}>
                <span className="o-team-name">{group.name}</span>
                <span className="o-mono-sm">
                  {group.members.length} pers.
                </span>
                <span className="o-hr" />
              </div>

              {group.members.map(member => {
                const editable = canEdit(member)
                return (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                    <div
                      style={{
                        width: 'var(--name-col)',
                        flex: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        paddingRight: 8,
                      }}
                    >
                      <div
                        className={`o-avatar${member.id === currentUser?.id ? ' o-avatar--self' : ''}`}
                        aria-hidden="true"
                      >
                        {initialsOf(member.name)}
                      </div>
                      <div
                        className="o-truncate"
                        style={{
                          flex: 1,
                          font: "400 12px/1.2 'IBM Plex Sans', sans-serif",
                          color: member.id === currentUser?.id ? 'var(--ink)' : 'var(--ink-2)',
                        }}
                      >
                        {member.name}
                      </div>
                      {member.country && (
                        <span title={member.country} style={{ fontSize: 12, lineHeight: 1, flex: 'none' }}>
                          {countryFlag(member.country)}
                        </span>
                      )}
                    </div>

                    {days.map(day => {
                      const holiday = holidayFor(holidays, member, day)
                      const part = absences.get(cellKey(member.id, day))?.part
                      const state = holiday ? 'Férié' : part ? PART_LABEL[part] : 'Présent'
                      const title = `${member.name} · ${longDate(day)} · ${state}`
                      const isMenuOpen = menu?.userId === member.id && menu?.day === day
                      const locked = !!holiday || !editable

                      return (
                        <div key={day} style={{ flex: 1, position: 'relative', minWidth: 30 }} data-menu-root={isMenuOpen || undefined}>
                          <button
                            type="button"
                            title={title}
                            aria-label={title}
                            disabled={locked}
                            className={[
                              'o-cell',
                              holiday ? 'o-cell--holiday' : '',
                              day === today ? 'o-cell--today' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            style={{ width: '100%', opacity: !holiday && !editable ? 0.45 : 1 }}
                            onClick={event => {
                              if (locked) return
                              // Ctrl/Cmd/Alt + clic ouvre le menu, comme le clic droit :
                              // le clic droit seul est un geste caché, et il est indisponible
                              // au trackpad sur certaines configurations.
                              if (event.ctrlKey || event.metaKey || event.altKey) {
                                setMenu(isMenuOpen ? null : { userId: member.id, day })
                                return
                              }
                              setMenu(null)
                              onCycle(member, day)
                            }}
                            onContextMenu={event => {
                              event.preventDefault()
                              event.stopPropagation()
                              if (locked) return
                              setMenu(isMenuOpen ? null : { userId: member.id, day })
                            }}
                          >
                            <span
                              className={`o-cell__am${part === 'full' || part === 'am' ? ' o-cell__am--on' : ''}`}
                            />
                            <span
                              className={`o-cell__pm${part === 'full' || part === 'pm' ? ' o-cell__pm--on' : ''}`}
                            />
                          </button>

                          {isMenuOpen && (
                            <div className="o-menu" role="menu">
                              {PART_ORDER.map(option => (
                                <button
                                  key={option}
                                  type="button"
                                  role="menuitem"
                                  className="o-menu__item"
                                  onClick={() => {
                                    onSet(member, day, option)
                                    setMenu(null)
                                  }}
                                >
                                  {PART_LABEL[option]}
                                </button>
                              ))}
                              <div className="o-menu__sep" />
                              <button
                                type="button"
                                role="menuitem"
                                className="o-menu__item o-menu__item--clear"
                                onClick={() => {
                                  onSet(member, day, undefined)
                                  setMenu(null)
                                }}
                              >
                                Effacer
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {showCoverage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                  <div
                    className="o-label"
                    style={{ width: 'var(--name-col)', flex: 'none', paddingRight: 8, textAlign: 'right' }}
                  >
                    Couverture min
                  </div>
                  {(coverageByGroup.get(group.id) ?? []).map((cov, i) => (
                    <div key={days[i]} style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 30 }}>
                      <span
                        title={
                          cov
                            ? `Matin ${cov.amPercent}% · Après-midi ${cov.pmPercent}% présents (${cov.active} au planning)`
                            : "Férié pour toute l'équipe"
                        }
                        style={{
                          minWidth: 34,
                          textAlign: 'center',
                          padding: '2px 0',
                          borderRadius: 4,
                          font: "500 10px 'IBM Plex Mono', monospace",
                          background: cov?.belowThreshold ? 'var(--alert-soft)' : 'transparent',
                          color: cov?.belowThreshold ? 'var(--alert-ink)' : 'var(--faint)',
                        }}
                      >
                        {cov ? `${cov.minPercent}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

        </div>
      </div>

      <Legend threshold={threshold} />
    </div>
  )
}

function Legend({ threshold }: { threshold: number }) {
  const swatch = (am: string, pm: string) => (
    <span style={{ width: 11, height: 22, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ flex: 1, borderRadius: 2, background: am }} />
      <span style={{ flex: 1, borderRadius: 2, background: pm }} />
    </span>
  )
  const item = (node: React.ReactNode, label: string) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 12 }}>
      {node}
      <span className="o-secondary">{label}</span>
    </span>
  )

  // La pastille de légende montre une valeur d'exemple toujours sous le seuil
  // (33% pour un seuil à 50%, comme la maquette), quel que soit le réglage.
  //
  // La légende est un pied fixe, hors de la zone défilante : avec beaucoup
  // d'équipes elle serait sinon reléguée sous tout le planning.
  return (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        flexWrap: 'wrap',
        padding: '0 22px 14px',
        borderTop: '1px solid var(--hairline)',
        background: 'var(--surface)',
      }}
    >
      {item(swatch('var(--accent)', 'var(--accent)'), 'Journée')}
      {item(swatch('var(--accent)', 'var(--track)'), 'Matin')}
      {item(swatch('var(--track)', 'var(--accent)'), 'Après-midi')}
      {item(
        <span style={{ width: 11, height: 22, borderRadius: 3, background: 'var(--hatch)' }} />,
        'Férié (pays de la personne)'
      )}
      {item(
        <span
          style={{
            padding: '2px 6px',
            borderRadius: 4,
            font: "500 10px 'IBM Plex Mono', monospace",
            background: 'var(--alert-soft)',
            color: 'var(--alert-ink)',
          }}
        >
          {Math.round(threshold * 0.66)}%
        </span>,
        `Sous le seuil de ${threshold}%`
      )}
      <span className="o-mono-sm" style={{ marginLeft: 'auto', paddingTop: 12 }}>
        clic = journée → matin → après-midi → libre · ctrl/clic droit = menu
      </span>
    </div>
  )
}
