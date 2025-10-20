import 'reflect-metadata';
import { Server } from 'http';
import * as grpc from '@grpc/grpc-js';
import app from './app';
import { config } from './config';
import logger from './utils/logger';
import { initializeDatabase, closeDatabase } from './config/database';
import { startGrpcServer, shutdownGrpcServer } from './grpc/server';
import { initializeMessaging, closeMessaging } from './messaging';

let server: Server | undefined;
let grpcServer: grpc.Server | undefined;

const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('✅ Database initialized successfully');

    // Initialize EventBus messaging system
    await initializeMessaging();
    logger.info('✅ EventBus messaging initialized successfully');

    // Start gRPC server
    const grpcPort = config.grpc.port;
    grpcServer = startGrpcServer(grpcPort);
    logger.info(`🔌 gRPC server started on port ${grpcPort}`);

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`🚀 ${config.serviceName} is running on port ${config.port}`);
      logger.info(`📝 Environment: ${config.env}`);
      logger.info(`🔗 API: http://localhost:${config.port}/api/${config.apiVersion}`);
      logger.info(`🗄️  Database: ${config.db.host}:${config.db.port}/${config.db.name}`);
      logger.info(`🐰 RabbitMQ: Connected`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const exitHandler = async () => {
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      if (grpcServer) {
        await shutdownGrpcServer(grpcServer);
      }
      await closeMessaging();
      await closeDatabase();
      process.exit(1);
    });
  } else {
    if (grpcServer) {
      await shutdownGrpcServer(grpcServer);
    }
    await closeMessaging();
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
      if (grpcServer) {
        await shutdownGrpcServer(grpcServer);
      }
      await closeMessaging();
      await closeDatabase();
    });
  }
});

startServer();
