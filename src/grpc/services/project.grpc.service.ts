import * as grpc from '@grpc/grpc-js';
import { getProjectById, getProjectMembers } from '../../services/project.service';
import { ProjectStatus } from '../../models/project.model';
import logger from '../../utils/logger';
import type {
  GrpcServerCall,
  GrpcCallback,
  GetProjectRequest,
  GetProjectResponse,
  ValidateProjectAccessRequest,
  ValidateProjectAccessResponse,
  GetProjectMembersRequest,
  GetProjectMembersResponse,
  CanAddTasksRequest,
  CanAddTasksResponse,
} from '../../types/grpc.types';

/**
 * gRPC Service Implementation for ProjectService
 */

/**
 * Get project details by ID
 */
export const getProject = async (
  call: GrpcServerCall<GetProjectRequest>,
  callback: GrpcCallback<GetProjectResponse>,
) => {
  try {
    const { project_id } = call.request;

    if (!project_id) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'project_id is required',
      });
    }

    const project = await getProjectById(project_id);

    callback(null, {
      id: project.id,
      name: project.name,
      description: project.description || '',
      status: project.status,
      owner: project.owner,
      members: project.members || [],
      tags: project.tags || [],
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error('gRPC GetProject error:', error);

    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode === 404) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: err.message || 'Project not found',
      });
    }

    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to fetch project',
    });
  }
};

/**
 * Validate if a user has access to a project
 */
export const validateProjectAccess = async (
  call: GrpcServerCall<ValidateProjectAccessRequest>,
  callback: GrpcCallback<ValidateProjectAccessResponse>,
) => {
  try {
    const { project_id, user_id } = call.request;

    if (!project_id || !user_id) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'project_id and user_id are required',
      });
    }

    const project = await getProjectById(project_id);

    // Check if user is owner or member
    const hasAccess =
      project.owner === user_id || (project.members && project.members.includes(user_id));

    callback(null, {
      has_access: hasAccess,
      message: hasAccess ? 'User has access to project' : 'User does not have access to project',
    });
  } catch (error) {
    logger.error('gRPC ValidateProjectAccess error:', error);

    const err = error as { statusCode?: number };
    if (err.statusCode === 404) {
      return callback(null, {
        has_access: false,
        message: 'Project not found',
      });
    }

    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to validate project access',
    });
  }
};

/**
 * Get project members
 */
export const getProjectMembersRpc = async (
  call: GrpcServerCall<GetProjectMembersRequest>,
  callback: GrpcCallback<GetProjectMembersResponse>,
) => {
  try {
    const { project_id } = call.request;

    if (!project_id) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'project_id is required',
      });
    }

    const members = await getProjectMembers(project_id);

    callback(null, {
      project_id,
      owner: members.owner,
      members: members.members || [],
    });
  } catch (error) {
    logger.error('gRPC GetProjectMembers error:', error);

    const err = error as { statusCode?: number };
    if (err.statusCode === 404) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'Project not found',
      });
    }

    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to fetch project members',
    });
  }
};

/**
 * Check if project can accept new tasks
 */
export const canAddTasks = async (
  call: GrpcServerCall<CanAddTasksRequest>,
  callback: GrpcCallback<CanAddTasksResponse>,
) => {
  try {
    const { project_id } = call.request;

    if (!project_id) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'project_id is required',
      });
    }

    const project = await getProjectById(project_id);

    const canAdd =
      project.status === ProjectStatus.ACTIVE || project.status === ProjectStatus.ON_HOLD;

    const message =
      project.status === ProjectStatus.ARCHIVED
        ? 'Cannot add tasks to archived project'
        : project.status === ProjectStatus.COMPLETED
          ? 'Cannot add tasks to completed project'
          : 'Project can accept new tasks';

    callback(null, {
      can_add: canAdd,
      status: project.status,
      message,
    });
  } catch (error) {
    logger.error('gRPC CanAddTasks error:', error);

    const err = error as { statusCode?: number };
    if (err.statusCode === 404) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: 'Project not found',
      });
    }

    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to check project status',
    });
  }
};
