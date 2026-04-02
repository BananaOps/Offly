# SSO Integration avec Dex

## Vue d'ensemble

Offly intègre l'authentification SSO via Dex (OIDC provider) avec gestion automatique des utilisateurs et contrôle d'accès basé sur les rôles (RBAC).

## Architecture

```
┌─────────────┐      ┌──────────┐      ┌──────────────┐      ┌──────────┐
│   Browser   │─────▶│   Dex    │─────▶│   Backend    │─────▶│  SQLite  │
│  (Frontend) │◀─────│  (OIDC)  │◀─────│ (Go + gRPC)  │◀─────│    DB    │
└─────────────┘      └──────────┘      └──────────────┘      └──────────┘
     PKCE Flow        ID Token           JWT Verify          User Storage
```

## Flux d'authentification

1. **Login**: L'utilisateur clique sur "Login" → redirection vers Dex
2. **Authentification Dex**: Saisie des credentials (vincent.team@bananaops.tech / test)
3. **Callback PKCE**: Échange du code contre un ID token + access token
4. **Auto-création**: Le frontend appelle `/api/v1/auth/ensure-user` avec le token
5. **Vérification JWT**: Le backend vérifie le token via JWKS de Dex
6. **Création utilisateur**: Si l'utilisateur n'existe pas, création automatique avec :
   - Extraction du nom, email depuis les claims JWT
   - Assignation au département `bananaops.tech`
   - Assignation à la team `admin` ou `user` selon le groupe

## Groupes et rôles

| Groupe Dex | Team Offly | Permissions |
|------------|------------|-------------|
| `admin`    | admin      | Tout (organisation, holidays, users, absences) |
| `user`     | user       | Son profil + ses absences uniquement |
| (aucun)    | user       | Son profil + ses absences uniquement |

## Permissions RBAC

### Utilisateurs non connectés
- ✅ Lecture seule (GET)
- ❌ Modification/Création/Suppression

### Utilisateurs connectés (role: user)
- ✅ GET : Toutes les données
- ✅ PUT : Son profil uniquement (`/api/v1/users/{son_id}`)
- ✅ POST/PUT/DELETE : Ses absences uniquement
- ❌ Modification de l'organisation (departments, teams)
- ❌ Modification des holidays

### Administrateurs (role: admin)
- ✅ Accès complet à toutes les routes

## Configuration

### Variables d'environnement (.env)

```bash
# Activer le SSO
AUTH_ENABLED=true

# Configuration Dex
AUTH_ISSUER_URL=http://localhost:5556/dex
AUTH_CLIENT_ID=offly
AUTH_JWKS_CACHE_TTL=3600

# Règles d'assignation des groupes
AUTH_DOMAIN_DEPARTMENT=bananaops.tech
AUTH_ADMIN_EMAILS=elie.copter@bananaops.tech
AUTH_ADMIN_GROUP=admin
AUTH_GROUP_ADMIN=admin
AUTH_GROUP_USER=user
```

### Dex Configuration (dex/config.yaml)

```yaml
staticClients:
- id: offly
  name: 'Offly Application'
  public: true
  redirectURIs:
  - 'http://localhost:3000/'

connectors:
- type: mockCallback
  id: mock-elie-admin
  name: Elie (Admin)
  config:
    username: "elie.copter"
    email: "elie.copter@bananaops.tech"
    groups: ["admin"]

- type: mockCallback
  id: mock-vincent-user
  name: Vincent (User)
  config:
    username: "vincent.team"
    email: "vincent.team@bananaops.tech"
    groups: ["user"]
```

## Utilisateurs de test

| Email | Mot de passe | Rôle | Groupe |
|-------|-------------|------|--------|
| vincent.team@bananaops.tech | test | User | user |
| elie.copter@bananaops.tech | test | Admin | admin |

## Démarrage

### Option 1: Script automatique
```bash
./start-sso.sh
```

### Option 2: Manuel

```bash
# Terminal 1 - Dex
cd dex && docker-compose up

# Terminal 2 - Backend
cd backend
export AUTH_ENABLED=true
export AUTH_ISSUER_URL=http://localhost:5556/dex
export AUTH_CLIENT_ID=offly
export AUTH_JWKS_CACHE_TTL=3600
export STORAGE_TYPE=sqlite
export SQLITE_DB_PATH=./offly.db
go run ./cmd/server

# Terminal 3 - Frontend
cd frontend
npm run dev
```

## Test du flux complet

1. Ouvrir http://localhost:3000
2. Cliquer sur "Login" dans la navbar
3. Sélectionner "Elie (Admin)" ou "Vincent (User)"
4. Entrer le mot de passe: `test`
5. Vérifier l'affichage du nom + badge "Admin" dans la navbar
6. Vérifier que l'utilisateur apparaît dans l'onglet "Users"
7. Tester les permissions selon le rôle

### Test permissions Admin (Elie)
- ✅ Créer/modifier departments et teams
- ✅ Créer/modifier holidays
- ✅ Créer/modifier users
- ✅ Créer/modifier absences

### Test permissions User (Vincent)
- ✅ Voir toutes les données
- ✅ Modifier son profil uniquement
- ✅ Créer/modifier ses absences
- ❌ Modifier l'organisation → 403 Forbidden
- ❌ Modifier les holidays → 403 Forbidden

## Endpoints API

### Auth
- `GET /api/v1/auth/config` - Configuration SSO (public)
- `POST /api/v1/auth/ensure-user` - Création automatique utilisateur (Bearer token)

### Protected (RBAC)
- `GET /api/v1/*` - Lecture seule pour tous
- `POST/PUT/DELETE /api/v1/users/{id}` - Propriétaire ou admin
- `POST/PUT/DELETE /api/v1/absences` - Propriétaire ou admin
- `POST/PUT/DELETE /api/v1/departments` - Admin uniquement
- `POST/PUT/DELETE /api/v1/teams` - Admin uniquement
- `POST/PUT/DELETE /api/v1/holidays` - Admin uniquement

## Sécurité

### PKCE (Proof Key for Code Exchange)
- Protection contre les attaques d'interception de code
- Code verifier stocké en sessionStorage
- Code challenge envoyé à Dex

### JWT Verification
- Vérification de la signature via JWKS de Dex
- Validation issuer, audience, expiration
- Cache JWKS pour performance

### Token Storage
- ID Token: localStorage (utilisé pour auth backend)
- Access Token: localStorage (optionnel)
- Code Verifier: sessionStorage (temporaire pour PKCE)

## Dépannage

### "Unregistered redirect_uri"
- Vérifier que `redirectURIs` dans dex/config.yaml contient `http://localhost:3000/`
- Rebuild Dex: `cd dex && docker-compose build --no-cache && docker-compose up`

### "Invalid client_id"
- Vérifier que `AUTH_CLIENT_ID=offly` correspond au client dans dex/config.yaml
- Rebuild Dex après modification de la config

### "Failed to verify token"
- Vérifier que `AUTH_ISSUER_URL=http://localhost:5556/dex` est correct
- Vérifier que Dex est démarré et accessible
- Vérifier les logs backend pour plus de détails

### Utilisateur non créé automatiquement
- Vérifier les logs backend après login
- Vérifier que `/api/v1/auth/ensure-user` est appelé (DevTools Network)
- Vérifier que le token contient `email` claim

## Architecture technique

### Frontend (React + TypeScript)
- `src/auth.ts`: Gestion PKCE, tokens, décodage JWT
- `src/components/Login.tsx`: UI login/logout avec affichage utilisateur/rôle
- `src/api.ts`: Injection du Bearer token dans les requêtes

### Backend (Go + gRPC)
- `internal/auth/oidc.go`: Vérificateur OIDC avec JWKS
- `internal/auth/handler.go`: Création automatique utilisateur + assignation groupes
- `internal/auth/middleware.go`: RBAC middleware
- `cmd/server/main.go`: Application du middleware selon AUTH_ENABLED

### Dex (OIDC Provider)
- Port 5556
- Mock connectors pour émission de groupes
- Configuration statique pour dev/test
