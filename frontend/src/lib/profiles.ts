import { JOB_PROFILES, User } from '../types'

/**
 * Libellés de profil pour l'interface.
 *
 * `JOB_PROFILES` (types.ts) porte des libellés anglais préfixés d'un emoji, hérités
 * de l'ancienne interface. design.md impose un ton français et n'autorise que les
 * drapeaux en emoji : on en tient donc une table propre ici, indexée sur les mêmes
 * valeurs pour que la donnée stockée reste inchangée.
 */
export const PROFILE_LABEL: Record<string, string> = {
  dev: 'Développement',
  ops: 'Ops / SRE',
  design: 'Design',
  qa: 'QA',
  po: 'Product Owner',
  data: 'Data',
  codir: 'CoDir',
  it_corp: 'IT Corp',
  bo: 'Business Owner',
  ml: 'ML',
  instru: 'Instrumentation',
  optim: 'Optimisation',
  helpdesk: 'Helpdesk',
  support: 'Support',
  other: 'Autre',
}

/** Repli pour une valeur inconnue : on retire l'emoji du libellé d'origine. */
const stripEmoji = (value: string): string =>
  JOB_PROFILES.find(p => p.value === value)?.label.replace(/^[^\p{L}]+/u, '') ?? value

export const profileLabel = (value?: string): string =>
  !value ? '' : (PROFILE_LABEL[value] ?? stripEmoji(value))

/**
 * Profils réellement portés par au moins une personne, triés par libellé.
 * On ne propose jamais les quinze valeurs du référentiel : un filtre qui ne
 * renvoie rien n'a pas sa place dans l'interface.
 */
export const usedProfiles = (users: User[]): { value: string; label: string }[] => {
  const seen = new Set<string>()
  for (const user of users) if (user.jobProfile) seen.add(user.jobProfile)
  return [...seen]
    .map(value => ({ value, label: profileLabel(value) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
