import { config } from '../config';
import * as taskGrpcClient from '../grpc/clients/task.grpc.client';
import createApiError from '../utils/ApiError';
import httpStatus from 'http-status';
import logger from '../utils/logger';

/**
 * Get project with task statistics
 */
export const getProjectWithTaskStats = async (projectId: string): Promise<any> => {
  try {
    const stats = await taskGrpcClient.getTaskStatistics(projectId, config.grpc.taskServiceUrl);

    return {
      projectId: stats.project_id,
      totalTasks: stats.total,
      tasksByStatus: {
        pending: stats.by_status.pending,
        inProgress: stats.by_status.in_progress,
        completed: stats.by_status.completed,
        cancelled: stats.by_status.cancelled,
      },
      completionRate: stats.completion_rate,
    };
  } catch (error) {
    logger.warn(`Failed to fetch task statistics for project ${projectId}:`, error);
    // Return empty stats if service is unavailable
    return {
      projectId,
      totalTasks: 0,
      tasksByStatus: {
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      },
      completionRate: '0.00',
    };
  }
};

/**
 * Delete project with task validation
 */
export const deleteProjectWithValidation = async (
  projectId: string,
  force: boolean = false,
): Promise<{ deleted: boolean; tasksDeleted?: number; message: string }> => {
  try {
    // Check if project has tasks
    const taskCount = await taskGrpcClient.countTasksByProject(
      projectId,
      config.grpc.taskServiceUrl,
    );

    if (taskCount.count > 0 && !force) {
      return {
        deleted: false,
        message: `Project has ${taskCount.count} task(s). Use force=true to delete with tasks.`,
      };
    }

    // If force, delete all tasks first
    if (force && taskCount.count > 0) {
      const deleteResult = await taskGrpcClient.deleteTasksByProject(
        projectId,
        true,
        config.grpc.taskServiceUrl,
      );

      logger.info(`Deleted ${deleteResult.deleted_count} tasks for project ${projectId}`);

      return {
        deleted: true,
        tasksDeleted: deleteResult.deleted_count,
        message: `Project deleted along with ${deleteResult.deleted_count} task(s)`,
      };
    }

    return {
      deleted: true,
      tasksDeleted: 0,
      message: 'Project deleted successfully',
    };
  } catch (error) {
    logger.error('gRPC error during project deletion:', error);
    throw createApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Task service is currently unavailable. Cannot verify tasks before deletion.',
    );
  }
};

/**
 * Get all tasks for a project
 */
export const getProjectTasks = async (projectId: string): Promise<any[]> => {
  try {
    const response = await taskGrpcClient.getTasksByProject(projectId, config.grpc.taskServiceUrl);

    return response.tasks || [];
  } catch (error) {
    logger.warn(`Failed to fetch tasks for project ${projectId}:`, error);
    return [];
  }
};

/**
 * Check if project has tasks
 */
export const hasProjectTasks = async (projectId: string): Promise<boolean> => {
  try {
    const countResponse = await taskGrpcClient.countTasksByProject(
      projectId,
      config.grpc.taskServiceUrl,
    );

    return countResponse.count > 0;
  } catch (error) {
    logger.warn(`Failed to check tasks for project ${projectId}:`, error);
    return false; // Assume no tasks if service unavailable
  }
};
