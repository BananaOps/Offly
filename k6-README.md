# K6 Data Seeding Script

Ce script k6 génère des données d'exemple pour Offly.

## Prérequis

Installer k6 :

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## Utilisation

### Local (port 8080)

```bash
k6 run k6-seed-data.js
```

### Avec URL personnalisée

```bash
k6 run -e API_URL=http://offly.local k6-seed-data.js
```

### Kubernetes (avec port-forward)

```bash
# Port forward
kubectl port-forward -n offly svc/offly 8080:8080

# Dans un autre terminal
k6 run k6-seed-data.js
```

## Données générées

Le script crée :

- **5 départements** : Engineering, Product, Sales, Marketing, HR
- **10 équipes** réparties dans les départements
- **12 utilisateurs** avec emails et pays (FR, US, UK)
- **29 jours fériés** pour 2025 (France, US, UK)
- **Absences aléatoires** pour chaque utilisateur (1-3 absences de 1-10 jours)

## Vérification

Après l'exécution, vous pouvez :

1. Accéder à l'application : http://localhost:8080
2. Voir la documentation API : http://localhost:8080/docs
3. Tester l'API :

```bash
# Lister les utilisateurs
curl http://localhost:8080/api/v1/users

# Lister les départements
curl http://localhost:8080/api/v1/departments

# Lister les absences
curl http://localhost:8080/api/v1/absences
```

## Nettoyage

Pour supprimer toutes les données, vous devez supprimer la base MongoDB :

```bash
# Kubernetes
kubectl exec -it -n offly offly-mongodb-0 -- mongosh offly --eval "db.dropDatabase()"

# Docker
docker exec -it offly-mongodb mongosh offly --eval "db.dropDatabase()"
```
