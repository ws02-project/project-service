import 'reflect-metadata';
import { Server } from 'http';
import app from './app';
import { config } from './config';
import logger from './utils/logger';
import { initializeDatabase, closeDatabase } from './config/database';

let server: Server | undefined;

const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('✅ Database initialized successfully');

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`🚀 ${config.serviceName} is running on port ${config.port}`);
      logger.info(`📝 Environment: ${config.env}`);
      logger.info(`🔗 API: http://localhost:${config.port}/api/${config.apiVersion}`);
      logger.info(`🗄️  Database: ${config.db.host}:${config.db.port}/${config.db.name}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const exitHandler = async () => {
  if (server) {
    server.close(async () => {
      logger.info('Server closed');
      await closeDatabase();
      process.exit(1);
    });
  } else {
    await closeDatabase();
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: Error) => {
  logger.error('Unexpected error:', error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close(async () => {
      await closeDatabase();
    });
  }
});

startServer();
