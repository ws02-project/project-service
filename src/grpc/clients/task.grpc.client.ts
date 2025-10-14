import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.resolve(__dirname, '../../../proto/task.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const taskProto = grpc.loadPackageDefinition(packageDefinition).task as any;

/**
 * Get Task gRPC Client
 * Connects to task-service gRPC server
 */
export const getTaskClient = (serverAddress: string = 'localhost:50052') => {
  return new taskProto.TaskService(serverAddress, grpc.credentials.createInsecure());
};

/**
 * Get Tasks by Project ID
 */
export const getTasksByProject = (projectId: string, serverAddress?: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const client = getTaskClient(serverAddress);
    client.GetTasksByProject({ project_id: projectId }, (error: any, response: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
};

/**
 * Get Task Statistics by Project ID
 */
export const getTaskStatistics = (projectId: string, serverAddress?: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const client = getTaskClient(serverAddress);
    client.GetTaskStatistics({ project_id: projectId }, (error: any, response: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
};

/**
 * Delete Tasks by Project ID
 */
export const deleteTasksByProject = (
  projectId: string,
  confirm: boolean = false,
  serverAddress?: string,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const client = getTaskClient(serverAddress);
    client.DeleteTasksByProject({ project_id: projectId, confirm }, (error: any, response: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
};

/**
 * Count Tasks by Project ID
 */
export const countTasksByProject = (projectId: string, serverAddress?: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const client = getTaskClient(serverAddress);
    client.CountTasksByProject({ project_id: projectId }, (error: any, response: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
};
