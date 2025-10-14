import type * as grpc from '@grpc/grpc-js';

// ============================================================================
// Project Service gRPC Request Types
// ============================================================================

export interface GetProjectRequest {
  project_id: string;
}

export interface ValidateProjectAccessRequest {
  project_id: string;
  user_id: string;
}

export interface GetProjectMembersRequest {
  project_id: string;
}

export interface CanAddTasksRequest {
  project_id: string;
}

// ============================================================================
// Project Service gRPC Response Types
// ============================================================================

export interface GetProjectResponse {
  id: string;
  name: string;
  description: string;
  status: string;
  owner: string;
  members: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ValidateProjectAccessResponse {
  has_access: boolean;
  message: string;
}

export interface GetProjectMembersResponse {
  project_id: string;
  owner: string;
  members: string[];
}

export interface CanAddTasksResponse {
  can_add: boolean;
  status: string;
  message: string;
}

// ============================================================================
// Task Service gRPC Request Types (for client)
// ============================================================================

export interface GetTasksByProjectRequest {
  project_id: string;
}

export interface GetTaskStatisticsRequest {
  project_id: string;
}

export interface DeleteTasksByProjectRequest {
  project_id: string;
  confirm: boolean;
}

export interface CountTasksByProjectRequest {
  project_id: string;
}

// ============================================================================
// Task Service gRPC Response Types (for client)
// ============================================================================

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  project_id: string;
  assigned_to: string;
  tags: string[];
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface GetTasksByProjectResponse {
  tasks: Task[];
  total: number;
}

export interface TaskStatusCount {
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

export interface GetTaskStatisticsResponse {
  project_id: string;
  total: number;
  by_status: TaskStatusCount;
  completion_rate: string;
}

export interface DeleteTasksByProjectResponse {
  deleted_count: number;
  message: string;
}

export interface CountTasksByProjectResponse {
  project_id: string;
  count: number;
}

// ============================================================================
// gRPC Generic Types
// ============================================================================

export interface GrpcServerCall<T = unknown> {
  request: T;
}

export type GrpcCallback<T = unknown> = (error: grpc.ServiceError | null, response?: T) => void;

export interface GrpcError extends Error {
  code?: grpc.status;
  message: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export const isGrpcError = (error: unknown): error is GrpcError => {
  return error instanceof Error && 'code' in error;
};
