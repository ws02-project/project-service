import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import logger from '../utils/logger';
import { getProjectGrpc, validateProjectAccessGrpc } from '../services/project.service';

interface ProjectProtoNamespace {
  ProjectService: {
    service: grpc.ServiceDefinition;
  };
}

const PROTO_PATH = path.resolve(__dirname, '../../proto/project.proto');

export const startGrpcServer = (port: number = 50051): grpc.Server => {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const projectProto = grpc.loadPackageDefinition(packageDefinition)
    .project as unknown as ProjectProtoNamespace;

  const server = new grpc.Server();

  server.addService(projectProto.ProjectService.service, {
    GetProject: getProjectGrpc,
    ValidateProjectAccess: validateProjectAccessGrpc,
  });

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, boundPort) => {
      if (error) {
        logger.error('Failed to start gRPC server:', error);
        throw error;
      }
      logger.info(`Project gRPC server running on port ${boundPort}`);
    },
  );

  return server;
};

/**
 * Gracefully shutdown gRPC server
 */
export const shutdownGrpcServer = (server: grpc.Server): Promise<void> => {
  return new Promise((resolve) => {
    server.tryShutdown(() => {
      logger.info('gRPC server shut down gracefully');
      resolve();
    });
  });
};
