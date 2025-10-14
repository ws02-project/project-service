# Project Service

A production-ready microservice for managing projects and workspaces, built with TypeScript, Express, and PostgreSQL using functional programming patterns.

## Features

- 🎯 **Project Management**: Create, read, update, and delete projects
- 👥 **Team Collaboration**: Add/remove team members to projects
- 📊 **Statistics**: Track project metrics and status distribution
- 🏷️ **Tagging System**: Organize projects with tags
- ✅ **Validation**: Request validation using Joi
- 🔒 **Security**: Helmet, CORS, and compression middleware
- 📝 **Logging**: Winston logger with customizable levels
- 🐳 **Docker**: Full Docker development and production setup
- 🗄️ **Database**: PostgreSQL with TypeORM migrations
- 🧪 **Testing**: Jest testing framework ready

## Project Structure

```
project-service/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── entities/        # TypeORM entities
│   ├── middlewares/     # Express middlewares
│   ├── migrations/      # Database migrations
│   ├── routes/          # API routes
│   ├── services/        # Business logic (functional)
│   ├── utils/           # Utility functions
│   ├── validations/     # Request validation schemas
│   ├── app.ts          # Express app setup
│   └── server.ts       # Server entry point
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.dev
└── package.json
```

## Prerequisites

- Node.js >= 22.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose

## Getting Started

### 1. Clone and Install

```bash
cd project-service
cp .env.example .env
pnpm install
```

### 2. Start Development Environment

```bash
# Start with Docker (recommended)
pnpm dev:build

# Or start locally
pnpm dev:local
```

### 3. Access the API

- API: http://localhost:3001/api/v1
- Health Check: http://localhost:3001/api/v1/health
- Projects: http://localhost:3001/api/v1/projects

## API Endpoints

### Projects

- `GET /api/v1/projects` - Get all projects
- `GET /api/v1/projects/:id` - Get project by ID
- `POST /api/v1/projects` - Create new project
- `PATCH /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project
- `GET /api/v1/projects/statistics` - Get project statistics

### Team Management

- `POST /api/v1/projects/:id/members` - Add member to project
- `DELETE /api/v1/projects/:id/members` - Remove member from project

## Development

### Available Scripts

```bash
# Development
pnpm dev                # Start dev environment
pnpm dev:rebuild        # Rebuild and restart containers (with volume cleanup)
pnpm deps:sync          # Sync dependencies (rebuild in background)
pnpm dev:local          # Start locally without Docker
pnpm dev:logs           # View logs
pnpm dev:down           # Stop containers

# Database
pnpm migration:run      # Run migrations
pnpm migration:revert   # Revert last migration
pnpm schema:sync        # Sync schema (dev only)

# Code Quality
pnpm lint               # Run ESLint
pnpm lint:fix           # Fix ESLint issues
pnpm format             # Format code with Prettier
pnpm test               # Run tests
pnpm test:coverage      # Run tests with coverage

# Build
pnpm build              # Build for production
pnpm start              # Start production server
```

### Adding/Removing Dependencies

When adding or removing pnpm dependencies:

```bash
# Add dependency
pnpm add <package-name>

# Remove dependency
pnpm remove <package-name>

# Sync changes to Docker container
pnpm dev:rebuild
# Or for background rebuild
pnpm deps:sync
```

## Environment Variables

See `.env.example` for all available environment variables.

## Docker

The service includes both development and production Docker configurations:

- **Development**: Hot reload with volume mounts
- **Production**: Optimized multi-stage build

### Port Configuration

- Service: 3001 (host) → 3001 (container)
- PostgreSQL: 5433 (host) → 5432 (container)

## Database Schema

### Projects Table

| Column      | Type         | Description                          |
| ----------- | ------------ | ------------------------------------ |
| id          | UUID         | Primary key                          |
| name        | VARCHAR(255) | Project name                         |
| description | TEXT         | Project description                  |
| status      | VARCHAR(50)  | active, archived, on_hold, completed |
| owner       | VARCHAR(100) | Project owner                        |
| members     | ARRAY        | Team member IDs                      |
| tags        | ARRAY        | Project tags                         |
| created_at  | TIMESTAMP    | Creation timestamp                   |
| updated_at  | TIMESTAMP    | Last update timestamp                |

## Architecture

This service follows functional programming principles:

- Pure functions for business logic
- Immutable data patterns
- Functional composition
- No classes (except TypeORM entities)

## Error Handling

The service uses a functional error handling approach with:

- Custom ApiError factory function
- Global error handler middleware
- Validation error handling
- Operational vs programming error distinction

## Logging

Winston logger with:

- JSON format for production
- Colorized console output for development
- Configurable log levels
- Request/response logging

## License

ISC
