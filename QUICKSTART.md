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
# Démarrer MongoDB
task mongo:start

# Lancer l'application (backend + frontend)
task dev
```

L'application sera accessible sur :
- **Frontend**: http://localhost:3000
- **API REST**: http://localhost:8080
- **gRPC**: localhost:50051
- **MongoDB**: localhost:27017

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
├── backend/              # API Go + gRPC
│   ├── cmd/server/      # Point d'entrée
│   ├── internal/
│   │   ├── service/     # Logique métier
│   │   └── storage/     # MongoDB + Memory
│   └── proto/           # Définitions protobuf
├── frontend/            # React + TypeScript
│   └── src/
│       ├── components/  # Composants UI
│       └── api.ts       # Client API
└── Taskfile.yml        # Automatisation
```

## Fonctionnalités

✅ Déclaration d'absences via grille calendaire  
✅ Gestion des utilisateurs  
✅ Organisation par départements et équipes  
✅ API REST et gRPC  
✅ Base de données MongoDB  
✅ Interface moderne avec Tailwind CSS  

## Troubleshooting

### MongoDB ne démarre pas
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

