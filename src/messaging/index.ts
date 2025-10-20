import { EventBus, ServiceRegistration } from './EventBus';
import { config } from '../config';
import logger from '../utils/logger';
import { handleTaskCreated, handleTaskDeleted } from '../services/project.service';

// Create EventBus instance
export const eventBus = new EventBus('project-service', 'microservices.exchange');

/**
 * Initialize and register the project-service with the messaging system
 * This shows how to manually register a service with queues and subscriptions
 */
export async function initializeMessaging(): Promise<void> {
  try {
    // Initialize connection
    await eventBus.initialize(config.rabbitmq.url);

    // Load protobuf schemas (mounted volume in Docker)
    // Load both project and task protos to deserialize events from both services
    await eventBus.loadProtoSchema(['/app/proto/project.proto', '/app/proto/task.proto']);

    // Define service registration
    const registration: ServiceRegistration = {
      serviceName: 'project-service',

      // Define queues this service owns
      queues: [
        {
          name: 'project-service.events',
          durable: true,
          deadLetterQueue: 'project-service.dlq',
          ttl: 31536000000, // 1 year
          maxLength: 10000,
        },
      ],

      // Subscribe to events from other services
      subscriptions: [
        {
          eventType: 'task.created',
          routingKey: 'task.created',
          sourceService: 'task-service',
        },
        {
          eventType: 'task.deleted',
          routingKey: 'task.deleted',
          sourceService: 'task-service',
        },
      ],
    };

    // Register the service
    await eventBus.registerService(registration);

    // Register event handlers
    registerEventHandlers();

    // Start consuming
    await eventBus.startConsuming();

    logger.info('✅ Messaging system initialized for project-service');
  } catch (error) {
    logger.error('Failed to initialize messaging:', error);
    throw error;
  }
}

/**
 * Register handlers for events from other services
 */
function registerEventHandlers(): void {
  // Handle task events - handlers are in project.service.ts
  eventBus.on('task.created', 'task.TaskCreatedEvent', handleTaskCreated);
  eventBus.on('task.deleted', 'task.TaskDeletedEvent', handleTaskDeleted);
}

/**
 * Publish project created event
 */
export async function publishProjectCreated(
  projectId: string,
  data: {
    name: string;
    description: string;
    status: string;
    owner: string | null;
    tags: string[];
  },
): Promise<void> {
  await eventBus.publish('project.created', 'project.created', 'project.ProjectCreatedEvent', {
    projectId,
    name: data.name,
    description: data.description,
    status: data.status,
    owner: data.owner || '',
    tags: data.tags,
    timestamp: Date.now(),
  });
}

/**
 * Publish project updated event
 */
export async function publishProjectUpdated(
  projectId: string,
  changes: Record<string, string>,
): Promise<void> {
  await eventBus.publish('project.updated', 'project.updated', 'project.ProjectUpdatedEvent', {
    projectId,
    changes,
    timestamp: Date.now(),
  });
}

/**
 * Publish project deleted event
 */
export async function publishProjectDeleted(projectId: string, deletedBy: string): Promise<void> {
  await eventBus.publish('project.deleted', 'project.deleted', 'project.ProjectDeletedEvent', {
    projectId,
    deletedBy,
    timestamp: Date.now(),
  });
}

/**
 * Publish project archived event
 */
export async function publishProjectArchived(projectId: string, archivedBy: string): Promise<void> {
  await eventBus.publish('project.archived', 'project.archived', 'project.ProjectArchivedEvent', {
    projectId,
    archivedBy,
    timestamp: Date.now(),
  });
}

/**
 * Close messaging connections
 */
export async function closeMessaging(): Promise<void> {
  await eventBus.close();
}
