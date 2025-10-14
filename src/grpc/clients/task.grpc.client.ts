import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import {
  TasksByProjectResponse,
  TaskStatisticsResponse,
  DeleteTasksResponse,
  CountTasksResponse,
  GrpcError,
} from '../../types/grpc.types';

const PROTO_PATH = path.resolve(__dirname, '../../../proto/task.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

interface TaskServiceClient extends grpc.Client {
  GetTasksByProject: (
    request: { project_id: string },
    callback: (error: GrpcError | null, response: TasksByProjectResponse) => void,
  ) => void;
  GetTaskStatistics: (
    request: { project_id: string },
    callback: (error: GrpcError | null, response: TaskStatisticsResponse) => void,
  ) => void;
  DeleteTasksByProject: (
    request: { project_id: string; confirm: boolean },
    callback: (error: GrpcError | null, response: DeleteTasksResponse) => void,
  ) => void;
  CountTasksByProject: (
    request: { project_id: string },
    callback: (error: GrpcError | null, response: CountTasksResponse) => void,
  ) => void;
}

const taskProto = grpc.loadPackageDefinition(packageDefinition).task as unknown as {
  TaskService: new (address: string, credentials: grpc.ChannelCredentials) => TaskServiceClient;
};

/**
 * Get Task gRPC Client
 * Connects to task-service gRPC server
 */
export const getTaskClient = (serverAddress = 'localhost:50052'): TaskServiceClient => {
  return new taskProto.TaskService(serverAddress, grpc.credentials.createInsecure());
};

/**
 * Get Tasks by Project ID
 */
export const getTasksByProject = (
  projectId: string,
  serverAddress?: string,
): Promise<TasksByProjectResponse> => {
  return new Promise((resolve, reject) => {
    const client = getTaskClient(serverAddress);
    client.GetTasksByProject({ project_id: projectId }, (error, response) => {
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
export const getTaskStatistics = (
  projectId: string,
  serverAddress?: string,
): Promise<TaskStatisticsResponse> => {
  return new Promise((resolve, reject) => {
    const client = getTaskClient(serverAddress);
    client.GetTaskStatistics({ project_id: projectId }, (error, response) => {
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
  confirm = false,
  serverAddress?: string,
): Promise<DeleteTasksResponse> => {
  return new Promise((resolve, reject) => {
    const client = getTaskClient(serverAddress);
    client.DeleteTasksByProject({ project_id: projectId, confirm }, (error, response) => {
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
export const countTasksByProject = (
  projectId: string,
  serverAddress?: string,
): Promise<CountTasksResponse> => {
  return new Promise((resolve, reject) => {
    const client = getTaskClient(serverAddress);
    client.CountTasksByProject({ project_id: projectId }, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
};
