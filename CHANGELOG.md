# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Offly - Time Off Manager
- Time off management with calendar grid view
- User management with roles, departments, and teams
- Organization structure management (departments and teams)
- Holiday management system
- Documentation page in the frontend
- Go backend with gRPC and REST API
- React + TypeScript + Tailwind CSS frontend
- MongoDB integration with in-memory fallback
- Helm chart for Kubernetes deployment
- Docker support with multi-stage builds
- Protocol Buffers for API definitions

### Features
- **Time Off Management**: Create, edit, and delete absences with different types
- **User Management**: Manage users with department and team assignments
- **Organization**: Define and manage departments and teams
- **Holidays**: Configure public holidays and company closures
- **Dark Mode**: Toggle between light and dark themes
- **Filtering**: Filter users by department and team in calendar view
- **API**: Both REST and gRPC APIs available
- **Health Checks**: Built-in health check endpoints

### Technical
- Backend: Go 1.21+ with gRPC and REST Gateway
- Frontend: React 18 with TypeScript and Vite
- Database: MongoDB 7+ with automatic fallback to in-memory storage
- Deployment: Kubernetes via Helm chart
- CI/CD: GitHub Actions for testing and releases
- Code Quality: golangci-lint, ESLint, Prettier

## [0.1.0] - Initial Release

### Added
- First public release of Offly
