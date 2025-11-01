# Project Service

Microservice for managing projects (workspaces) and project members in a task management system.

## Overview

The Project Service handles project lifecycle management, member assignments, and provides gRPC endpoints for other services to validate project access and retrieve project information. It communicates with Task Service to get project statistics and publishes events for project-related actions.

## Architecture & Technology Stack

### Core Technologies

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Knex.js (Query Builder + Migrations)
- **API Style:** REST (HTTP) + gRPC
- **Message Broker:** RabbitMQ (Event Publishing)
- **Validation:** Joi
- **Logging:** Winston
- **Testing:** Jest + Supertest

### Communication Patterns

- **HTTP REST API:** External client communication (port 3001)
- **gRPC Server:** Exposes ProjectService on port 50051 for other services
- **gRPC Client:** Calls TaskService on port 50052 for statistics
- **Event Publishing:** Publishes project events to RabbitMQ

### Port Allocation

- **HTTP API:** `3001` (REST endpoints)
- **gRPC Server:** `50051` (ProjectService)
- **Database:** PostgreSQL on `5433`
- **RabbitMQ:** `5672` (AMQP)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ and pnpm (for local development)

### Run with Docker Compose

Start service with database and RabbitMQ:

```bash
cd project-service
docker-compose up -d
```

View logs:

```bash
docker-compose logs -f project-service
```

Stop service:

```bash
docker-compose down
```

### Local Development Setup

Install dependencies:

```bash
pnpm install
```

Start PostgreSQL and RabbitMQ:

```bash
docker-compose up -d project-postgres rabbitmq
```

Run migrations:

```bash
pnpm migration:run
```

Start development server with hot reload:

```bash
pnpm dev
```

Service will be available at:

- HTTP API: http://localhost:3001/api/v1
- gRPC Server: localhost:50051

## API Endpoints

### REST API

Base URL: `http://localhost:3001/api/v1`

#### Health Check

- **GET** `/health` - Service health status

#### Projects

- **GET** `/projects` - List all projects
  - Query params: `status`, `limit`, `offset`
  - Returns: Array of projects with member counts
- **POST** `/projects` - Create new project
  - Body: `{ name, description?, ownerId }`
  - Returns: Created project
  - Event: `project.created` published
- **GET** `/projects/:id` - Get project by ID
  - Returns: Project with members and task count
- **PATCH** `/projects/:id` - Update project
  - Body: `{ name?, description?, status? }`
  - Returns: Updated project
  - Event: `project.updated` published
- **DELETE** `/projects/:id` - Delete project
  - Returns: Success confirmation
  - Event: `project.deleted` published

#### Project Members

- **POST** `/projects/:id/members` - Add member to project
  - Body: `{ userId, role }`
  - Returns: Updated project with members
  - Event: `project.member.added` published
- **DELETE** `/projects/:id/members` - Remove member from project
  - Body: `{ userId }`
  - Returns: Updated project
  - Event: `project.member.removed` published

#### Statistics

- **GET** `/projects/statistics` - Get project statistics
  - Returns: Total count, status breakdown

### gRPC API

Service: `ProjectService` on port `50051`

**Proto definition:** See `/proto/project.proto`

#### Methods

**GetProject** - Retrieve project details

- Request: `{ projectId }`
- Response: `{ project { id, name, description, status, ownerId, createdAt, updatedAt } }`

**ValidateProjectAccess** - Check if user can access project

- Request: `{ projectId, userId }`
- Response: `{ hasAccess, role }`

**GetProjectMembers** - List project members

- Request: `{ projectId }`
- Response: `{ members: [{ userId, role, addedAt }] }`

**CanAddTasks** - Check if project accepts new tasks

- Request: `{ projectId }`
- Response: `{ canAdd, reason }`

**GetProjectsByIds** - Bulk retrieve projects

- Request: `{ projectIds: [] }`
- Response: `{ projects: [] }`

## Event Publishing (RabbitMQ)

The service publishes events for project-related actions.

### Published Events

**Exchange:** `project_events` (topic exchange)

**Events:**

- `project.created` - New project created
  - Routing key: `project.created`
  - Payload: `{ projectId, name, ownerId, timestamp }`

- `project.updated` - Project modified
  - Routing key: `project.updated`
  - Payload: `{ projectId, changes, timestamp }`

- `project.deleted` - Project deleted
  - Routing key: `project.deleted`
  - Payload: `{ projectId, timestamp }`

- `project.member.added` - Member added to project
  - Routing key: `project.member.added`
  - Payload: `{ projectId, userId, role, timestamp }`

- `project.member.removed` - Member removed from project
  - Routing key: `project.member.removed`
  - Payload: `{ projectId, userId, timestamp }`

## Authentication

See [AUTHENTICATION.md](../AUTHENTICATION.md) for detailed authentication architecture.

### Current Implementation

- JWT-based authentication planned
- Token validation middleware (example in `middlewares/`)
- User context extraction from tokens
- Service-to-service authentication via gRPC metadata

### Future Enhancement

- mTLS for production (see [MTLS_ARCHITECTURE.md](../MTLS_ARCHITECTURE.md))
- Integration with Asgardeo (WSO2) identity provider

## Database & Migrations

### Schema

**Table:** `projects`

- `id` - UUID primary key
- `name` - Project name (string, required)
- `description` - Project description (text, optional)
- `status` - Project status (enum: active, archived, deleted)
- `owner_id` - User ID of project owner (UUID)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

**Table:** `project_members`

- `id` - UUID primary key
- `project_id` - Foreign key to projects
- `user_id` - User ID (UUID)
- `role` - Member role (enum: owner, admin, member, viewer)
- `added_at` - Timestamp when member was added

### Running Migrations

List pending migrations:

```bash
pnpm migration:list
```

Run migrations:

```bash
pnpm migration:run
```

Rollback last migration:

```bash
pnpm migration:rollback
```

Create new migration:

```bash
pnpm migration:create <migration-name>
```

## Development

### Project Structure

```
project-service/
├── src/
│   ├── app.ts                 # Express app setup
│   ├── server.ts              # Entry point, starts HTTP & gRPC
│   ├── config/                # Configuration management
│   │   ├── index.ts          # Main config
│   │   ├── database.ts       # Knex database config
│   │   └── ormconfig.ts      # Database connection
│   ├── controllers/          # HTTP request handlers
│   │   └── project.controller.ts
│   ├── services/             # Business logic
│   │   └── project.service.ts
│   ├── models/               # Database models
│   │   └── project.model.ts
│   ├── routes/               # API route definitions
│   │   ├── index.ts
│   │   └── project.routes.ts
│   ├── validations/          # Joi validation schemas
│   │   └── project.validation.ts
│   ├── grpc/                 # gRPC implementation
│   │   ├── server.ts         # gRPC server setup
│   │   └── clients/
│   │       └── task.grpc.client.ts
│   ├── messaging/            # RabbitMQ event bus
│   │   ├── EventBus.ts
│   │   └── index.ts
│   ├── middlewares/          # Express & gRPC middleware
│   │   ├── auth.middleware.example.ts
│   │   ├── grpc-auth.middleware.example.ts
│   │   ├── errorHandler.ts
│   │   └── validate.ts
│   ├── migrations/           # Database migrations
│   │   └── v1_initial_schema.ts
│   ├── utils/                # Utilities
│   │   ├── logger.ts
│   │   ├── ApiError.ts
│   │   └── catchAsync.ts
│   └── types/                # TypeScript definitions
│       ├── express.d.ts
│       └── grpc.types.ts
├── package.json
├── tsconfig.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

### Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build TypeScript to JavaScript
- `pnpm start` - Start production server
- `pnpm test` - Run tests with Jest
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Generate test coverage report
- `pnpm lint` - Lint code with ESLint
- `pnpm lint:fix` - Fix linting issues
- `pnpm format` - Format code with Prettier
- `pnpm migration:create` - Create new migration
- `pnpm migration:run` - Run pending migrations
- `pnpm migration:rollback` - Rollback last migration
- `pnpm migration:list` - List migrations
- `pnpm proto:generate` - Generate TypeScript from proto files

### Environment Variables

Create `.env` file based on `.env.example`:

```env
# Server
NODE_ENV=development
PORT=3001
API_VERSION=v1
SERVICE_NAME=project-service
LOG_LEVEL=debug

# gRPC
GRPC_PORT=50051
TASK_SERVICE_GRPC_URL=localhost:50052

# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=projectdb
DB_USER=projectuser
DB_PASSWORD=projectpass
DB_POOL_MIN=2
DB_POOL_MAX=10

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

## Testing

### Running Tests

Run all tests:

```bash
pnpm test
```

Run with coverage:

```bash
pnpm test:coverage
```

Watch mode for development:

```bash
pnpm test:watch
```

### Test Structure

Tests are located in `src/__tests__/`:

- `project.test.ts` - Project API integration tests

## Deployment

### Docker Build

Build image:

```bash
docker build -t project-service:latest .
```

Run container:

```bash
docker run -p 3001:3001 -p 50051:50051 \
  -e DB_HOST=host.docker.internal \
  -e RABBITMQ_URL=amqp://admin:admin123@host.docker.internal:5672 \
  project-service:latest
```

### Multi-Service Deployment

Use the root `docker-compose.yml` to run all services together:

```bash
cd /home/dasunp/Projects/ws02
docker-compose up -d
```

## Related Documentation

- [Root README](../README.md) - Overall architecture and quick start
- [AUTHENTICATION.md](../AUTHENTICATION.md) - Authentication architecture
- [MTLS_ARCHITECTURE.md](../MTLS_ARCHITECTURE.md) - mTLS implementation details
- [MESSAGING.md](../MESSAGING.md) - Event-driven architecture patterns
- [Proto README](../proto/README.md) - gRPC service definitions

## Troubleshooting

### Database Connection Issues

Check if PostgreSQL is running:

```bash
docker-compose ps project-postgres
```

Check logs:

```bash
docker-compose logs project-postgres
```

Verify connection:

```bash
docker-compose exec project-postgres psql -U projectuser -d projectdb
```

### gRPC Connection Issues

Verify Task Service is running:

```bash
curl http://localhost:3000/api/v1/health
```

Check gRPC port:

```bash
netstat -an | grep 50052
```

### RabbitMQ Issues

Check RabbitMQ management UI:

```
http://localhost:15672
Username: admin
Password: admin123
```

Verify exchange and queues exist.

### View Service Logs

```bash
docker-compose logs -f project-service
```

## Contributing

1. Follow TypeScript and ESLint guidelines
2. Write tests for new features
3. Update documentation for API changes
4. Use conventional commits
5. Run linter and tests before committing

## License

MIT
