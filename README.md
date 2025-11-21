# Offly - Time Off Manager

[![Release](https://img.shields.io/github/v/release/BananaOps/offly)](https://github.com/BananaOps/offly/releases)
[![License](https://img.shields.io/github/license/BananaOps/offly)](LICENSE)
[![Go Tests](https://github.com/BananaOps/offly/workflows/Go%20Tests/badge.svg)](https://github.com/BananaOps/offly/actions)
[![Docker Pulls](https://img.shields.io/docker/pulls/bananaops/offly-backend)](https://hub.docker.com/r/bananaops/offly-backend)

Modern time off and absence management system with Go backend (gRPC + REST) and React + TypeScript + Tailwind CSS frontend.

> 📖 **New here?** Check out the [Quick Start Guide](QUICKSTART.md) to get started in 5 minutes!

## Architecture

- **Backend**: Go avec gRPC, Protocol Buffers, et REST Gateway
- **Frontend**: React + TypeScript + Tailwind CSS
- **Base de données**: MongoDB (avec fallback en mémoire)

## Fonctionnalités

- Vue grille calendaire pour déclarer les absences
- Gestion des utilisateurs
- Organisation par départements et équipes
- API REST et gRPC
- Interface moderne avec Tailwind CSS

## Prérequis

- Go 1.21+
- Node.js 18+
- MongoDB 7+ (ou Docker)
- Task (https://taskfile.dev)
- Buf (https://buf.build) - pour la génération protobuf

## Installation Rapide

### Avec Task (recommandé)

```bash
# Configuration complète du projet
task setup

# Démarrer MongoDB avec Docker
task mongo:start

# Lancer l'application (backend + frontend)
task dev
```

### Manuel

#### Backend

```bash
cd backend

# Installer les dépendances
make deps

# Générer le code protobuf
make proto

# Lancer le serveur
make run
```

Le serveur gRPC écoute sur le port 50051 et la gateway REST sur le port 8080.

#### Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'application frontend sera accessible sur http://localhost:3000

## Commandes Task Disponibles

```bash
task install          # Installer toutes les dépendances
task proto            # Générer le code protobuf avec buf
task proto:lint       # Linter les fichiers protobuf
task proto:breaking   # Vérifier les changements breaking
task format           # Formater le code (backend + frontend)
task lint             # Linter le code (backend + frontend)
task build            # Builder l'application complète
task test             # Lancer les tests
task dev              # Lancer en mode développement
task mongo:start      # Démarrer MongoDB
task mongo:stop       # Arrêter MongoDB
task pre-commit       # Vérifications avant commit
task clean            # Nettoyer les fichiers générés
```

## Docker

Pour lancer l'application complète avec Docker Compose:

```bash
docker-compose up -d
```

Cela démarre:
- MongoDB sur le port 27017
- Backend (gRPC: 50051, REST: 8080)
- Frontend sur le port 3000

## Kubernetes avec Skaffold

Pour le développement sur Kubernetes avec hot reload:

```bash
# Démarrer en mode développement
task skaffold:dev
# ou
skaffold dev -f skaffold.dev.yaml
```

Skaffold va:
- Builder les images Docker
- Déployer sur Kubernetes avec Helm
- Configurer le port forwarding automatique
- Recharger automatiquement lors des changements de code

Pour plus d'informations, consultez [SKAFFOLD.md](SKAFFOLD.md)

## Structure du Projet

```
.
├── backend/
│   ├── cmd/server/          # Point d'entrée du serveur
│   ├── internal/
│   │   ├── service/         # Services gRPC
│   │   └── storage/         # Couche de stockage (MongoDB + Memory)
│   ├── proto/               # Définitions Protocol Buffers
│   ├── Dockerfile           # Image Docker backend
│   └── Makefile             # Commandes make
├── frontend/
│   ├── src/
│   │   ├── components/      # Composants React
│   │   ├── api.ts          # Client API
│   │   └── types.ts        # Types TypeScript
│   ├── Dockerfile           # Image Docker frontend
│   └── nginx.conf           # Configuration Nginx
├── docker-compose.yml       # Orchestration Docker
├── Taskfile.yml            # Automatisation des tâches
└── .env.example            # Variables d'environnement
```

## API Endpoints

### REST API (port 8080)

- `POST /api/v1/users` - Créer un utilisateur
- `GET /api/v1/users` - Lister les utilisateurs
- `POST /api/v1/departments` - Créer un département
- `GET /api/v1/departments` - Lister les départements
- `POST /api/v1/teams` - Créer une équipe
- `GET /api/v1/teams` - Lister les équipes
- `POST /api/v1/absences` - Créer une absence
- `GET /api/v1/absences` - Lister les absences
- `PUT /api/v1/absences/{id}` - Modifier une absence
- `DELETE /api/v1/absences/{id}` - Supprimer une absence

### gRPC (port 50051)

Services disponibles:
- `AbsenceService`
- `UserService`
- `OrganizationService`

## Développement

### Workflow recommandé

1. **Avant de commencer**: `task setup`
2. **Démarrer MongoDB**: `task mongo:start`
3. **Développer**: `task dev`
4. **Avant de commit**: `task pre-commit`

### Modifier les définitions protobuf

1. Éditez `backend/proto/absence.proto`
2. Lintez les fichiers proto: `task proto:lint`
3. Régénérez le code: `task proto`
4. Redémarrez le backend

Buf est utilisé pour la génération du code protobuf, offrant une meilleure gestion des dépendances et un linting intégré.

### Base de données

L'application utilise MongoDB par défaut. Si MongoDB n'est pas disponible, elle bascule automatiquement sur un stockage en mémoire.

Pour se connecter à MongoDB:
```bash
# Avec Docker
docker exec -it absence-mongo mongosh offly

# Local
mongosh offly
```

### Variables d'environnement

Copiez `.env.example` vers `.env` et ajustez les valeurs selon votre environnement.

## Troubleshooting

**MongoDB ne démarre pas**:
```bash
task mongo:stop
task mongo:start
```

**Erreurs de compilation protobuf**:
```bash
task install:backend
task proto:lint  # Vérifier les erreurs de syntaxe
task proto       # Régénérer le code
```

**Installer buf manuellement**:
```bash
# macOS
brew install bufbuild/buf/buf

# Linux
curl -sSL "https://github.com/bufbuild/buf/releases/latest/download/buf-$(uname -s)-$(uname -m)" -o /usr/local/bin/buf
chmod +x /usr/local/bin/buf

# Ou via Go
go install github.com/bufbuild/buf/cmd/buf@latest
```

**Problèmes de dépendances frontend**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Releases

### Using Docker Images

Pull the latest image from Docker Hub:

```bash
# Full stack image (backend + frontend)
docker pull bananaops/offly:latest
docker pull bananaops/offly:0.1.0

# Run the application
docker run -p 8080:8080 -p 50051:50051 bananaops/offly:latest
```

The application will be available at:
- Web UI: http://localhost:8080
- REST API: http://localhost:8080/api/v1
- gRPC: localhost:50051

### Using Helm Chart

Add the Helm repository and install:

```bash
# Add repository
helm repo add offly https://bananaops.github.io/offly
helm repo update

# Install
helm install offly offly/offly

# Install specific version
helm install offly offly/offly --version 0.1.0
```

### Release Process

We use [Release Please](https://github.com/googleapis/release-please) for automated releases based on [Conventional Commits](https://www.conventionalcommits.org/).

For detailed information about creating releases, see [RELEASING.md](RELEASING.md).

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

### Commit Message Format

We follow the Conventional Commits specification:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `chore:` Maintenance tasks
- `ci:` CI/CD changes

Example:
```bash
git commit -m "feat: add new absence type filter"
git commit -m "fix: correct date calculation in calendar"
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/BananaOps/offly)
- 🐛 [Issue Tracker](https://github.com/BananaOps/offly/issues)
- 💬 [Discussions](https://github.com/BananaOps/offly/discussions)
