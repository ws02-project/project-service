import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  project_id: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

interface GetTasksByProjectResponse {
  tasks: Task[];
}

interface TaskStatistics {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}

interface GetTaskStatisticsResponse {
  statistics: TaskStatistics;
}

interface DeleteTasksByProjectResponse {
  success: boolean;
  deleted_count: number;
  message: string;
}

interface CountTasksByProjectResponse {
  count: number;
}

interface TaskServiceClient {
  GetTasksByProject(
    request: { project_id: string },
    callback: (error: grpc.ServiceError | null, response: GetTasksByProjectResponse) => void,
  ): void;
  GetTaskStatistics(
    request: { project_id: string },
    callback: (error: grpc.ServiceError | null, response: GetTaskStatisticsResponse) => void,
  ): void;
  DeleteTasksByProject(
    request: { project_id: string; confirm: boolean },
    callback: (error: grpc.ServiceError | null, response: DeleteTasksByProjectResponse) => void,
  ): void;
  CountTasksByProject(
    request: { project_id: string },
    callback: (error: grpc.ServiceError | null, response: CountTasksByProjectResponse) => void,
  ): void;
}

type ServiceClientConstructor = new (
  address: string,
  credentials: grpc.ChannelCredentials,
) => TaskServiceClient;

interface TaskProtoNamespace {
  TaskService: ServiceClientConstructor;
}

const PROTO_PATH = path.resolve(__dirname, '../../../proto/task.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const taskProto = grpc.loadPackageDefinition(packageDefinition)
  .task as unknown as TaskProtoNamespace;

export const getTaskClient = (serverAddress: string = 'localhost:50052'): TaskServiceClient => {
  return new taskProto.TaskService(serverAddress, grpc.credentials.createInsecure());
};

export const getTasksByProject = (
  projectId: string,
  serverAddress?: string,
): Promise<GetTasksByProjectResponse> => {
  return new Promise((resolve, reject) => {
    const client = getTaskClient(serverAddress);
    client.GetTasksByProject(
      { project_id: projectId },
      (error: grpc.ServiceError | null, response: GetTasksByProjectResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      },
    );
  });
};

export const getTaskStatistics = (
  projectId: string,
  serverAddress?: string,
): Promise<GetTaskStatisticsResponse> => {
  return new Promise((resolve, reject) => {
    const client = getTaskClient(serverAddress);
    client.GetTaskStatistics(
      { project_id: projectId },
      (error: grpc.ServiceError | null, response: GetTaskStatisticsResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      },
    );
  });
};

export const deleteTasksByProject = (
  projectId: string,
  confirm: boolean = false,
  serverAddress?: string,
): Promise<DeleteTasksByProjectResponse> => {
  return new Promise((resolve, reject) => {
    const client = getTaskClient(serverAddress);
    client.DeleteTasksByProject(
      { project_id: projectId, confirm },
      (error: grpc.ServiceError | null, response: DeleteTasksByProjectResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      },
    );
  });
};

export const countTasksByProject = (
  projectId: string,
  serverAddress?: string,
): Promise<CountTasksByProjectResponse> => {
  return new Promise((resolve, reject) => {
    const client = getTaskClient(serverAddress);
    client.CountTasksByProject(
      { project_id: projectId },
      (error: grpc.ServiceError | null, response: CountTasksByProjectResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      },
    );
  });
};
