# Offly — design system

Application de gestion d'absence. Le pari du produit : on ne saisit **pas** de type de congé. On déclare une portion de journée — **matin, après-midi, journée** — et l'équipe voit immédiatement l'effet sur sa couverture.

Repo source : `BananaOps/Offly` (branche `main`).

---

## 1. Principes & ton

**1. La grille est le produit.**
Le calendrier d'équipe n'est pas une vue de consultation, c'est la surface de saisie. Un clic dans une case pose une absence. Tout formulaire est un chemin secondaire, jamais le chemin principal.

**2. Trois états, pas de taxonomie.**
Matin / après-midi / journée. Pas de motif obligatoire, pas de solde à choisir. Un commentaire libre reste optionnel. Toute demande d'ajout de champ doit justifier ce qu'elle retire à la vitesse de saisie.

**3. Le collectif avant l'individu.**
Chaque écran répond d'abord à « qui manque dans l'équipe ? », ensuite à « où en suis-je ? ». La couverture d'équipe est affichée en permanence, pas derrière un rapport.

**4. Le seuil alerte, il ne bloque pas.**
Sous 50% d'effectif présent sur une demi-journée, l'interface le signale (bandeau + pastille rose). Elle n'interdit rien : la décision reste humaine.

**5. Multi-pays par défaut.**
Un jour férié dépend du pays de la personne, pas du calendrier de l'entreprise. Une case fériée est hachurée, non cliquable, et exclue du calcul de couverture.

**6. Calme, dense, blanc.**
Beaucoup de blanc, une seule couleur porteuse de sens (violet = absence), des hachures pour le non-travaillé, du rose seulement pour l'alerte. Aucun aplat décoratif, aucun dégradé dans l'interface — le dégradé vit uniquement dans le logo.

**7. Micro-interactions, pas d'animation.**
Transitions de 120 à 140 ms sur couleur, ombre et translation. Rien qui dure plus de 200 ms, rien qui bouge sans action de l'utilisateur.

**Ton d'écriture.** Français, phrase courte, pas d'injonction ni d'emoji dans l'UI. On nomme les choses telles qu'elles sont : « Poser une absence », « Couverture min », « Férié ». Les libellés de portion sont toujours « Journée / Matin / Après-midi », dans cet ordre.

---

## 2. Tokens

Implémentés en propriétés CSS sous `.offly` dans `frontend/src/design/offly.css`.

### Couleur

| Rôle | Valeur | Usage |
|---|---|---|
| `--ink` | `#14141A` | Texte principal, boutons pleins |
| `--ink-2` | `#3A3A4A` | Noms de personnes, texte de liste |
| `--muted` | `#8A8A9B` | Texte secondaire, descriptions |
| `--faint` | `#6E6E80` | Labels mono, en-têtes de colonne (4.99:1 sur blanc) |
| `--hairline` | `rgba(20,20,30,.07)` | Séparateurs |
| `--border` | `rgba(20,20,30,.12)` | Bordure de champ, de bouton secondaire |
| `--surface` | `#FFFFFF` | Cartes, grille |
| `--surface-2` | `#FCFCFD` | Rail de navigation, encadré de résumé |
| `--track` | `#F4F4F7` | Demi-journée libre |
| `--track-today` | `#EDEAFB` | Demi-journée libre, colonne du jour |
| `--accent` | `#6C4DFF` | Absence posée, sélection, focus |
| `--accent-soft` | `#F1EEFF` | Fond d'item actif, chips |
| `--accent-ink` | `#4B2FE0` | Texte sur `accent-soft`, hover de lien |
| `--alert` | `#FF6FB5` | Pastille de seuil |
| `--alert-soft` | `#FFF0F7` | Fond de bandeau et de pastille sous seuil |
| `--alert-ink` | `#C2185B` | Chiffre sous seuil (4.8:1 sur `alert-soft`) |
| `--hatch` | `repeating-linear-gradient(45deg,#E4E4EA 0 3px,#F7F7FA 3px 6px)` | Jour férié |

Le système n'emploie que deux teintes porteuses de sens : le violet `--accent` pour l'absence posée, le rose `--alert` pour le franchissement de seuil. Le logo n'introduit aucune couleur supplémentaire — il reprend ces deux mêmes valeurs (voir §5). Toute nouvelle couleur doit être dérivée en oklch à chroma et luminosité constantes.

### Typographie

IBM Plex Sans pour tout le texte, IBM Plex Mono pour les données et les micro-labels.

| Style | Spécification |
|---|---|
| Titre d'écran | 18px / 600 / -0.015em |
| Titre de carte | 13px / 600 |
| Nom d'équipe | 11px / 600 |
| Corps, champs | 12.5px / 400 |
| Nom de personne, liste | 12px / 400 |
| Secondaire | 11.5px / 400 |
| Label mono | 9.5px / 400 / .06em / majuscules |
| Donnée mono | 10–11.5px / 500 |

Aucun texte porteur d'information ne descend sous 4.5:1 : les labels mono de 9.5 px utilisent `--faint`, jamais un gris plus clair. Le système ne contient pas de gris décoratif.

Un seul niveau de titre par écran. Pas de gras dans le corps de texte : la hiérarchie passe par la couleur et la taille.

### Espacement & forme

Échelle 2 / 3 / 4 / 6 / 8 / 10 / 14 / 18 / 22 px. Rayons : 3–4 px (demi-journée), 6–7 px (bouton, champ, item de nav), 9–10 px (carte, bandeau, menu), 13–14 px (chip, pastille). Ombres : `0 1px 3px rgba(20,20,30,.06)` pour une carte, `0 8px 24px rgba(20,20,30,.14)` pour un menu flottant. Colonne de noms : 206 px. Hauteur de ligne de grille : 34 px (confortable) ou 26 px (compact).

---

## 3. Inventaire de composants

### Grille
- **DayColumnHeader** — abréviation du jour (mono) + pastille de date ; pastille violette pleine pour aujourd'hui. Reste collé en haut au défilement.
- **HalfDayCell** — deux demi-barres empilées, matin au-dessus. Clic = journée → matin → après-midi → libre. Ctrl/Cmd/Alt + clic ou clic droit ouvre le menu. Hover : anneau violet 2 px. État férié : hachuré, non cliquable. `title` = personne · date longue · état.
- **PersonRow** — avatar initiales 22 px (violet plein si c'est moi), nom tronqué, drapeau du pays.
- **TeamGroupHeader** — nom d'équipe, effectif mono, filet.
- **CoverageRow** — une pastille par jour : minimum des présences matin / après-midi. Rose sous le seuil, `title` avec les deux valeurs. Les personnes en férié sortent du dénominateur ; si toute l'équipe est fériée, la pastille affiche « — ».
- **Legend** — journée / matin / après-midi / férié / sous seuil + rappel des gestes. Pied fixe, hors de la zone défilante.

### Saisie
- **GridQuickMenu** — menu flottant sous la case : Journée, Matin, Après-midi, séparateur, Effacer.
- **AbsencePanel** — Du / Au, segmented de portion, commentaire optionnel, encadré de résumé (total décompté + impact équipe), Enregistrer / Annuler.
- **CommandBar** — saisie en français, chips de relecture (date + portion), suggestions cliquables, total et Confirmer.
- **SegmentedControl** — 3 options max, piste `--track`, vignette blanche portée par une ombre légère.

### Chrome & communs
- **Rail** — logo, 4 entrées (Calendrier, Équipes, Personnes, Jours fériés), bloc « Prochains fériés » en pied.
- **RangeNav** — ‹ / Aujourd'hui / › dans un même conteneur bordé.
- **FilterChips** — sélection unique, chip active en `--ink`.
- **AlertBanner** — pastille ronde, titre, détail ; fond `--alert-soft`.
- **Button** — primaire `--ink` → `--accent` au hover ; secondaire blanc bordé ; fantôme dans les barres d'outils. Un bouton sans sujet n'est pas rendu plutôt que rendu désactivé.
- **Field** — hauteur 34 px, bordure `--border`, focus `--accent`, label mono au-dessus.
- **Chip / Pill** — `--accent-soft` pour une valeur reconnue, `--alert-soft` pour une valeur sous seuil.
- **Avatar** — initiales sur 2 lettres, mono.

### Écrans secondaires
- **TeamCard** (Équipes) — nom, effectif, répartition par drapeau, deux barres de couverture matin / après-midi (rose sous le seuil), liste des membres avec drapeau et badge d'état du jour, pied « Prochaine tension ».
- **PeopleTable** (Personnes) — recherche, chips d'équipe, lignes : avatar, nom, équipe, drapeau + pays, demi-journées posées, prochaine absence, badge du jour.
- **HolidayCountryCard** (Jours fériés) — en-tête drapeau 20 px + pays + code ISO, liste des dates en mono avec le nom du jour ; les dates tombant un week-end sont marquées par le tag « week-end », pas par un gris affaibli.
- **CountryFilterChips** — chips avec drapeau, sélection unique.

**Règle drapeaux.** Le pays est toujours porté par un drapeau emoji, jamais par une couleur : 12 px dans une ligne de grille, 12–14 px dans une liste, 20 px en en-tête de carte. Le code ISO reste disponible en `title` ou en pastille mono. Le drapeau est le seul emoji autorisé dans l'interface.

### À concevoir
File de validation manager, exports RH, gestion des fériés par pays (écran d'administration), variante sombre, états vides et de chargement.

---

## 4. Règles d'application

- Une absence est stockée par personne et par jour avec une valeur `am | pm | full` ; pas d'heures.
- La couverture se calcule par demi-journée, jamais en moyenne journalière : c'est le minimum des deux qui est affiché.
- Un férié n'est ni une absence ni une présence : la personne quitte le dénominateur ce jour-là.
- Le seuil (50% par défaut) est un réglage, pas une constante.
- Toute donnée numérique est en IBM Plex Mono, pour qu'un chiffre ne se lise jamais comme du texte.

---

## 5. Logo

La marque est le **créneau** : les deux demi-barres empilées de `HalfDayCell`, matin au-dessus, après-midi en dessous. Le logo est donc le composant central du produit réduit à son plus simple appareil — il ne raconte pas « calendrier » en général, il raconte la demi-journée.

Proportions reprises du swatch de légende (11 × 22, gouttière 2, rayon 2), remises à l'échelle du carré.

| Fichier | Usage |
|---|---|
| `frontend/public/favicon.svg` | Marque sur fond transparent — rail, onglet du navigateur |
| `frontend/public/favicon-32x32.png` | Repli PNG 32 px, pour les agents qui ne rendent pas un favicon SVG |
| `frontend/public/apple-touch-icon.svg` | Variante pleine, barres blanches sur dégradé, pour l'icône d'application |

Le logo n'emploie que les deux teintes de l'interface : `--accent` `#6C4DFF` pour le matin, `--alert` `#FF6FB5` pour l'après-midi. Il n'introduit aucune couleur propre. Le dégradé de l'icône d'application est la seule occurrence d'un dégradé dans le système, et il relie ces deux mêmes valeurs.

**Pas d'aplat sous la marque.** La version rail/onglet est transparente : un fond blanc poserait une plaque visible sur `--surface-2`, et les deux barres restent lisibles aussi bien sur un onglet clair que sombre. Seule l'icône d'application porte un fond, parce qu'iOS en impose un.
