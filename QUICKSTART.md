# Guide de Démarrage Rapide

##  en 3 étapes

### 1. Installer les outils requis

#### Task (gestionnaire de tâches)
```bash
# macOS
brew install go-task/tap/go-task

# Linux
sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin

# Windows (PowerShell)
choco install go-task
```

#### Buf (génération protobuf)
```bash
# macOS
brew install bufbuild/buf/buf

# Linux
curl -sSL "https://github.com/bufbuild/buf/releases/latest/download/buf-$(uname -s)-$(uname -m)" -o /usr/local/bin/buf
chmod +x /usr/local/bin/buf

# Windows (PowerShell)
choco install buf

# Ou via Go (toutes plateformes)
go install github.com/bufbuild/buf/cmd/buf@latest
```

#### Docker (pour MongoDB)
Téléchargez depuis https://www.docker.com/get-started

### 2. Configuration du projet

```bash
# Cloner le projet
git clone <votre-repo>
cd offly

# Installer toutes les dépendances et configurer le projet
task setup
```

Cette commande va :
- Installer les dépendances Go
- Installer les dépendances npm
- Générer le code protobuf
- Formater le code

### 3. Lancer l'application

```bash
# Lancer l'application (backend + frontend)
# SQLite par défaut : aucun service externe à démarrer
task dev
```

L'application sera accessible sur :
- **Frontend**: http://localhost:3000
- **API REST**: http://localhost:8080
- **gRPC**: localhost:50051

> Pour développer sur MongoDB à la place : `task mongo:start` puis `STORAGE_TYPE=mongodb task dev`
> (MongoDB écoute alors sur localhost:27017).

## Commandes Utiles

### Développement quotidien
```bash
task dev              # Lancer l'app en mode dev
task format           # Formater le code
task lint             # Vérifier le code
task test             # Lancer les tests
```

### Protobuf
```bash
task proto            # Générer le code depuis .proto
task proto:lint       # Vérifier la syntaxe protobuf
```

### MongoDB
```bash
task mongo:start      # Démarrer MongoDB
task mongo:stop       # Arrêter MongoDB
task mongo:logs       # Voir les logs
```

### Avant de commit
```bash
task pre-commit       # Format + Lint + Test
```

## Structure de l'Application

```
offly/
├── backend/                  # API Go + gRPC
│   ├── cmd/server/          # Point d'entrée
│   ├── internal/
│   │   ├── auth/            # OIDC, JWT, RBAC
│   │   ├── mcp/             # Serveur MCP (optionnel)
│   │   ├── service/         # Logique métier
│   │   └── storage/         # SQLite · MongoDB · mémoire
│   └── proto/               # Définitions protobuf
├── frontend/                 # React + TypeScript
│   └── src/
│       ├── components/offly/ # Les 4 écrans + rail
│       ├── design/offly.css  # Tokens du design system
│       ├── lib/              # Modèle demi-journée, CSV, profils
│       └── api.ts            # Client API
├── design.md                 # Design system
└── Taskfile.yml             # Automatisation
```

## Fonctionnalités

✅ Saisie d'absence directement dans la grille — journée, matin ou après-midi  
✅ Couverture d'équipe par demi-journée, avec alerte sous le seuil  
✅ Jours fériés par pays de la personne  
✅ Filtres par équipe et par profil métier  
✅ Export CSV des absences, import/export CSV des jours fériés  
✅ API REST et gRPC, serveur MCP optionnel  
✅ SQLite par défaut, MongoDB en option  

## Troubleshooting

### MongoDB ne démarre pas
<!-- Uniquement si vous avez choisi STORAGE_TYPE=mongodb ; par défaut Offly utilise SQLite. -->
```bash
task mongo:stop
docker ps -a | grep mongo  # Vérifier l'état
task mongo:start
```

### Erreur "buf: command not found"
```bash
go install github.com/bufbuild/buf/cmd/buf@latest
# Assurez-vous que $GOPATH/bin est dans votre PATH
export PATH=$PATH:$(go env GOPATH)/bin
```

### Erreur de compilation Go
```bash
cd backend
go mod tidy
task proto
```

### Erreur npm
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Développement avec Docker

Si vous préférez utiliser Docker pour tout :

```bash
# Lancer toute l'application
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

## Prochaines Étapes

1. Créez des utilisateurs via l'onglet "Utilisateurs"
2. Créez des départements et équipes via "Organisation"
3. Assignez les utilisateurs aux départements/équipes
4. Déclarez des absences via la grille calendaire

Bon développement ! 🚀

