# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/BananaOps/Offly/compare/v1.0.0...v1.1.0) (2026-09-15)


### Features

* add main and frontend .dockerignore files to manage build context and dependencies ([b188db1](https://github.com/BananaOps/Offly/commit/b188db1819aab5aff7d59fe04337d43517d6f700))
* add PeopleScreen, TeamsScreen, and Rail components with styling ([e65363c](https://github.com/BananaOps/Offly/commit/e65363c6c4e2c212982210bd0a8cb25f9f07616d))
* add profile filtering and export functionality ([56b25cf](https://github.com/BananaOps/Offly/commit/56b25cffb5d7e254cc866680b160e57a965d9038))
* enhance absence management with memoization and holiday caching ([13fad89](https://github.com/BananaOps/Offly/commit/13fad894435c2dd2d3d978920d747966bb7878df))
* enhance server configuration with dynamic port handling and add tests ([6ac7016](https://github.com/BananaOps/Offly/commit/6ac70163dba901b91870e1d53f816b943d19982d))
* **holidayManager:** expand country list with comprehensive regional organization ([b727580](https://github.com/BananaOps/Offly/commit/b7275807fd6243aea99e08277b41d4920c9b4ce5))
* **mcp:** add Model Context Protocol server for LLM integration ([78afea5](https://github.com/BananaOps/Offly/commit/78afea5ad4595db488d262f9f8adeb7d46d80098))
* update Docker documentation to clarify build context and .dockerignore usage ([49d0c39](https://github.com/BananaOps/Offly/commit/49d0c390db37b4b29fff13a9b668d14b74ff1d1f))


### Bug Fixes

* **Dockerfile:** update OpenAPI specs copy command to include all files ([94ea87e](https://github.com/BananaOps/Offly/commit/94ea87e72c8410b590cb1d23153851030ff10abb))

## 1.0.0 (2026-04-03)


### Features

* init project ([#1](https://github.com/BananaOps/Offly/issues/1)) ([f3d96c7](https://github.com/BananaOps/Offly/commit/f3d96c7beb72164f6a3a7939f6884f721d3561c4))

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
