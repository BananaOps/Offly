# Intégration SSO (OIDC)

## Vue d'ensemble

Offly s'authentifie auprès de n'importe quel fournisseur **OpenID Connect** :
Dex (environnement de dev fourni), **Microsoft Entra ID**, Keycloak… Les
utilisateurs sont créés automatiquement à la première connexion, et les droits
(RBAC) sont attribués **par groupe** et/ou par email.

## Architecture

```
┌──────────┐  1. /api/v1/auth/login   ┌──────────────┐  2. authorize (state, nonce, PKCE)  ┌────────────┐
│ Browser  │─────────────────────────▶│   Backend    │────────────────────────────────────▶│ Fournisseur│
│(Frontend)│◀─────────────────────────│ (Go + gRPC)  │◀────────────────────────────────────│    OIDC    │
└──────────┘  5. cookie HttpOnly      └──────────────┘  3-4. callback → échange du code    └────────────┘
                 auth_token                                    (client secret + PKCE)
```

Flux *authorization code* **confidentiel**, entièrement piloté par le backend :

1. Le bouton « Login » envoie le navigateur sur `GET /api/v1/auth/login`.
2. Le backend génère `state`, `nonce` et un vérificateur **PKCE (S256)**, les
   garde dans des cookies HttpOnly éphémères, puis redirige vers l'endpoint
   d'autorisation du fournisseur (obtenu par **discovery OIDC**).
3. Le fournisseur rappelle `GET /api/v1/auth/callback?code=…&state=…`.
4. Le backend vérifie le `state` (CSRF), échange le code (client secret +
   `code_verifier`), puis vérifie l'ID token : signature (JWKS, algorithmes
   asymétriques uniquement), `iss`, `aud`, `exp` et `nonce`.
5. Il applique `AUTH_ALLOWED_GROUPS`, crée/met à jour l'utilisateur, pose le
   cookie de session `auth_token` (HttpOnly, Secure) et redirige vers
   `AUTH_POST_LOGIN_REDIRECT_URL`.

Le frontend ne connaît ni l'issuer ni le client : il appelle seulement
`/api/v1/auth/login`, `/api/v1/auth/me` et `/api/v1/auth/logout`.

## Rôles et RBAC

| Identité | Rôle Offly | Droits |
|----------|-----------|--------|
| Membre d'un groupe de `AUTH_ADMIN_GROUPS`, ou email dans `AUTH_ADMIN_EMAILS` | `admin` | Tout (organisation, jours fériés, utilisateurs, absences) |
| Autre utilisateur autorisé | `user` | Lecture de tout ; écriture de son profil et de ses absences uniquement |
| Hors `AUTH_ALLOWED_GROUPS` (si défini) | — | Connexion refusée (403) |
| Non connecté | — | Lecture seule (GET) |

Les groupes sont lus dans le claim `AUTH_GROUPS_CLAIM` (`groups` par défaut ;
`roles` pour s'appuyer sur les *app roles* Entra ID).

## Configuration

| Variable | Défaut | Description |
|----------|--------|-------------|
| `AUTH_ENABLED` | `false` | Active le SSO |
| `AUTH_ISSUER_URL` | `http://localhost:5556/dex` | Issuer OIDC |
| `AUTH_CLIENT_ID` | `offly` | Client ID |
| `AUTH_CLIENT_SECRET` | — | Client secret (obligatoire) |
| `AUTH_REDIRECT_URL` | `http://localhost:8080/api/v1/auth/callback` | Redirect URI déclarée chez le fournisseur |
| `AUTH_POST_LOGIN_REDIRECT_URL` | `http://localhost:3000/` | Page d'arrivée après connexion |
| `AUTH_SCOPES` | `openid profile email groups` | Scopes demandés (Entra ID : `openid profile email`) |
| `AUTH_GROUPS_CLAIM` | `groups` | Claim portant les groupes |
| `AUTH_ADMIN_GROUPS` | — | Groupes administrateurs, séparés par des virgules (`AUTH_ADMIN_GROUP` accepté) |
| `AUTH_ALLOWED_GROUPS` | — | Groupes autorisés à se connecter ; vide = tout utilisateur authentifié |
| `AUTH_ADMIN_EMAILS` | — | Emails administrateurs (`ADMIN_EMAILS` accepté) |
| `AUTH_AUTHORIZATION_URL` / `AUTH_TOKEN_URL` / `AUTH_JWKS_URL` | discovery | Surcharges des endpoints (sinon `<issuer>/.well-known/openid-configuration`, puis convention Dex) |
| `AUTH_JWKS_CACHE_TTL` | `3600` | Rafraîchissement du JWKS (secondes) |

## Microsoft Entra ID

### 1. App registration

Dans **Entra ID → App registrations → New registration** :

- **Supported account types** : *Single tenant*.
- **Redirect URI** : plateforme **Web**, `https://<offly>/api/v1/auth/callback`.
- **Certificates & secrets** : créer un *client secret* → `AUTH_CLIENT_SECRET`.
- **Token configuration** :
  - **Add groups claim** → *Groups assigned to the application*, format
    **Group ID** pour l'ID token. Limiter aux groupes assignés évite le
    dépassement (*overage*) au-delà de 200 groupes, où Entra ne liste plus les
    groupes dans le token.
  - **Add optional claim** → ID token → `email` (sinon Offly utilise
    `preferred_username`, l'UPN).
- **Enterprise applications → Offly → Users and groups** : assigner les groupes
  (admins et utilisateurs). Avec *Assignment required = Yes*, Entra refuse
  lui-même la connexion aux non-membres.

### 2. Variables

```bash
AUTH_ENABLED=true
AUTH_ISSUER_URL=https://login.microsoftonline.com/<tenant-id>/v2.0
AUTH_CLIENT_ID=<application-client-id>
AUTH_CLIENT_SECRET=<client-secret>
AUTH_REDIRECT_URL=https://offly.example.com/api/v1/auth/callback
AUTH_POST_LOGIN_REDIRECT_URL=https://offly.example.com/
AUTH_SCOPES="openid profile email"
AUTH_ADMIN_GROUPS=<object-id-groupe-admins>
AUTH_ALLOWED_GROUPS=<object-id-groupe-utilisateurs>
```

Les endpoints (`/oauth2/v2.0/authorize`, `/oauth2/v2.0/token`,
`/discovery/v2.0/keys`) sont découverts automatiquement depuis l'issuer.

### 3. Helm

```yaml
auth:
  enabled: true
  issuerUrl: https://login.microsoftonline.com/<tenant-id>/v2.0
  clientId: <application-client-id>
  existingSecret: offly-oidc        # clé "client-secret"
  publicUrl: https://offly.example.com
  scopes: "openid profile email"
  adminGroups: [<object-id-groupe-admins>]
  allowedGroups: [<object-id-groupe-utilisateurs>]
```

## Dex (développement local)

```bash
# Terminal 1 - Dex
cd dex && docker-compose up

# Terminal 2 - Backend
cd backend
export AUTH_ENABLED=true
export AUTH_ISSUER_URL=http://localhost:5556/dex
export AUTH_CLIENT_ID=offly
export AUTH_CLIENT_SECRET=<secret du client Dex>
export AUTH_ADMIN_GROUPS=admin
export STORAGE_TYPE=sqlite
export SQLITE_DB_PATH=./offly.db
go run ./cmd/server

# Terminal 3 - Frontend
cd frontend && npm run dev
```

Les valeurs par défaut (`AUTH_REDIRECT_URL`, `AUTH_POST_LOGIN_REDIRECT_URL`,
`AUTH_SCOPES` avec `groups`) correspondent à cette configuration.

## Endpoints

- `GET /api/v1/auth/config` — configuration SSO (public)
- `GET /api/v1/auth/login` — démarre la connexion
- `GET /api/v1/auth/callback` — retour du fournisseur
- `GET /api/v1/auth/me` — utilisateur courant et rôle
- `POST /api/v1/auth/logout` — supprime la session locale
- `POST /api/v1/auth/ensure-user` — provisionne l'utilisateur d'un Bearer token

## Dépannage

| Symptôme | Cause probable |
|----------|----------------|
| `AADSTS50011` (redirect URI mismatch) | `AUTH_REDIRECT_URL` différente de la redirect URI enregistrée (plateforme **Web**) |
| `AADSTS70011` (invalid scope) | `groups` présent dans `AUTH_SCOPES` : le retirer pour Entra ID |
| « Invalid login state » | Cookies bloqués, ou plus de 10 min entre `/login` et le retour |
| « Email claim missing » | Ni `email` ni `preferred_username` au format email dans le token |
| Utilisateur toujours `user` | Groupe absent du token (groups claim non configuré, overage) ou `AUTH_ADMIN_GROUPS` ne contient pas l'**object ID** |
| 403 « not a member of an allowed group » | Utilisateur hors `AUTH_ALLOWED_GROUPS` |
