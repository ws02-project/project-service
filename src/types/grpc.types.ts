/**
 * gRPC Type Definitions for Project Service
 */

// Task Service gRPC Response Types
export interface TaskResponse {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  project_id?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface TasksByProjectResponse {
  tasks: TaskResponse[];
  total: number;
}

export interface TaskStatisticsResponse {
  project_id: string;
  total: number;
  by_status: {
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  completion_rate: string;
}

export interface DeleteTasksResponse {
  success: boolean;
  deleted_count: number;
  message: string;
}

export interface CountTasksResponse {
  project_id: string;
  count: number;
}

// gRPC Error Type
export interface GrpcError extends Error {
  code?: number;
  details?: string;
  metadata?: unknown;
}
