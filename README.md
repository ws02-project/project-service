# Project Service

Microservice for project/workspace management with member assignments, gRPC inter-service communication, and event publishing.

## Tech Stack

| Category   | Technology           |
| ---------- | -------------------- |
| Runtime    | Node.js 24 LTS       |
| Language   | TypeScript           |
| Framework  | Express.js           |
| Database   | PostgreSQL + TypeORM |
| API        | REST + gRPC          |
| Messaging  | RabbitMQ             |
| Validation | Joi                  |
| Testing    | Jest + Supertest     |

## Ports

| Service  | Port  |
| -------- | ----- |
| HTTP API | 3001  |
| gRPC     | 50051 |

## Quick Start

### Docker (Recommended)

```bash
docker-compose up -d
```

### Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev:local
```

## API Endpoints

### REST API

| Method | Endpoint                       | Description        |
| ------ | ------------------------------ | ------------------ |
| GET    | `/api/v1/health`               | Health check       |
| GET    | `/api/v1/projects`             | List projects      |
| POST   | `/api/v1/projects`             | Create project     |
| GET    | `/api/v1/projects/:id`         | Get project        |
| PATCH  | `/api/v1/projects/:id`         | Update project     |
| DELETE | `/api/v1/projects/:id`         | Delete project     |
| POST   | `/api/v1/projects/:id/members` | Add member         |
| DELETE | `/api/v1/projects/:id/members` | Remove member      |
| GET    | `/api/v1/projects/statistics`  | Project statistics |

### gRPC Methods

| Method                | Description            |
| --------------------- | ---------------------- |
| GetProject            | Get project details    |
| ValidateProjectAccess | Check user access      |
| GetProjectMembers     | List members           |
| CanAddTasks           | Check if accepts tasks |
| GetProjectsByIds      | Bulk get projects      |

## Events Published

| Event           | Routing Key              |
| --------------- | ------------------------ |
| Project Created | `project.created`        |
| Project Updated | `project.updated`        |
| Project Deleted | `project.deleted`        |
| Member Added    | `project.member.added`   |
| Member Removed  | `project.member.removed` |

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3001
GRPC_PORT=50051
SERVICE_NAME=project-service

# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=projectdb
DB_USER=projectuser
DB_PASSWORD=projectpass

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# gRPC Clients
TASK_SERVICE_GRPC_URL=localhost:50052
```

## Project Structure

```
src/
├── config/           # Configuration
├── controllers/      # HTTP handlers
├── services/         # Business logic
├── models/           # Database entities (project, member)
├── routes/           # API routes
├── validations/      # Joi schemas
├── grpc/             # gRPC server & clients
├── messaging/        # RabbitMQ EventBus
├── middlewares/      # Express middleware
├── utils/            # Utilities (logger, ApiError, catchAsync)
└── __tests__/        # Tests (unit + integration)
```

## Scripts

| Command              | Description                   |
| -------------------- | ----------------------------- |
| `pnpm dev`           | Start with Docker             |
| `pnpm dev:local`     | Start locally with hot reload |
| `pnpm build`         | Build TypeScript              |
| `pnpm start`         | Start production              |
| `pnpm test`          | Run tests                     |
| `pnpm lint`          | Lint code                     |
| `pnpm migration:run` | Run migrations                |

## Testing

```bash
# Run all tests
pnpm test

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

## License

MIT
