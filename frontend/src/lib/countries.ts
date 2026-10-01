/**
 * Annuaire des pays — source unique de l'application.
 *
 * Deux principes, pour ne plus avoir à éditer une liste à chaque pays manquant :
 *
 * 1. les *codes* sont la liste ISO 3166-1 alpha-2 complète (249 pays + `XK`,
 *    le code de fait du Kosovo) : rien n'y manque, il n'y a donc rien à y
 *    ajouter. Le stock ISO ne bouge qu'une fois par décennie ;
 * 2. les *noms* ne sont pas écrits ici. Ils viennent d'`Intl.DisplayNames`
 *    en français — design.md impose une UI francophone — ce qui évite une
 *    table de traduction à maintenir et suit les renommages officiels
 *    (`TR` rend « Turquie », `SZ` « Eswatini »).
 *
 * Un code stocké hors de cette liste reste affiché et sélectionnable : voir
 * `countryOptions`. Le backend ne valide pas le pays (`user_service.go` se
 * contente d'un `strings.ToUpper`), la liste n'est donc qu'un confort de saisie.
 */

/**
 * ISO 3166-1 alpha-2, codes officiellement assignés, plus `XK`.
 * Les alias dépréciés (`UK`, `SU`, `YU`…) et les codes non étatiques de CLDR
 * (`EU`, `UN`, `ZZ`…) en sont volontairement absents.
 */
const ISO_3166_1_ALPHA_2 = `
  AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE
  BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD
  CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM
  DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF
  GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU
  ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN
  KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME
  MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA
  NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM
  PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI
  SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK
  TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI
  VN VU WF WS XK YE YT ZA ZM ZW
`

export const COUNTRY_CODES: string[] = ISO_3166_1_ALPHA_2.trim().split(/\s+/)

const KNOWN = new Set(COUNTRY_CODES)

/** Drapeau emoji depuis le code : deux Regional Indicator Symbols. */
export const countryFlag = (code?: string): string => {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map(c => 127397 + c.charCodeAt(0))
  )
}

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['fr'], { type: 'region' })
  } catch {
    return null
  }
})()

/** Nom du pays en français ; à défaut le `fallback` fourni, sinon le code. */
export const countryName = (code: string | undefined, fallback?: string): string => {
  if (!code) return fallback ?? ''
  const upper = code.toUpperCase()
  try {
    return regionNames?.of(upper) ?? fallback ?? upper
  } catch {
    return fallback ?? upper
  }
}

export interface Country {
  code: string
  name: string
}

const byName = (a: Country, b: Country) => a.name.localeCompare(b.name, 'fr')

/** Tous les pays, nommés en français et triés par nom. */
export const countries: Country[] = COUNTRY_CODES.map(code => ({
  code,
  name: countryName(code),
})).sort(byName)

/**
 * La liste de saisie, augmentée des codes déjà stockés qu'elle ignore : une
 * fiche portant un code hors ISO (saisie historique, import CSV) ne doit pas
 * le perdre silencieusement à la première modification.
 */
export const countryOptions = (extra: (string | undefined)[] = []): Country[] => {
  const unknown = new Map<string, Country>()
  for (const raw of extra) {
    const code = raw?.trim().toUpperCase()
    if (!code || KNOWN.has(code) || unknown.has(code)) continue
    unknown.set(code, { code, name: countryName(code, code) })
  }
  if (unknown.size === 0) return countries
  return [...countries, ...unknown.values()].sort(byName)
}
