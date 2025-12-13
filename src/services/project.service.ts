import { Repository } from 'typeorm';
import {
  Project,
  CreateProjectDTO,
  UpdateProjectDTO,
  ProjectStatus,
} from '../models/project.model';
import createApiError from '../utils/ApiError';
import httpStatus from 'http-status';
import { AppDataSource } from '../config/database';
import { publishProjectCreated } from '../messaging';
import * as grpc from '@grpc/grpc-js';
import logger from '../utils/logger';
import type {
  GrpcServerCall,
  GrpcCallback,
  GetProjectRequest,
  GetProjectResponse,
  ValidateProjectAccessRequest,
  ValidateProjectAccessResponse,
} from '../types/grpc.types';

const getProjectRepository = (): Repository<Project> => AppDataSource.getRepository(Project);

export const getAllProjects = async (): Promise<Project[]> => {
  const projectRepository = getProjectRepository();
  return await projectRepository.find({
    order: { createdAt: 'DESC' },
  });
};

export const getProjectById = async (id: string): Promise<Project> => {
  const projectRepository = getProjectRepository();
  const project = await projectRepository.findOne({ where: { id } });

  if (!project) {
    throw createApiError(httpStatus.NOT_FOUND, 'Project not found');
  }

  return project;
};

export const getProjectsByStatus = async (status: ProjectStatus): Promise<Project[]> => {
  const projectRepository = getProjectRepository();
  return await projectRepository.find({
    where: { status },
    order: { createdAt: 'DESC' },
  });
};

export const getProjectsByOwner = async (owner: string): Promise<Project[]> => {
  const projectRepository = getProjectRepository();
  return await projectRepository.find({
    where: { owner },
    order: { createdAt: 'DESC' },
  });
};

export const createProject = async (projectData: CreateProjectDTO): Promise<Project> => {
  const startTime = Date.now();
  const projectRepository = getProjectRepository();
  const project = projectRepository.create({
    name: projectData.name,
    description: projectData.description,
    status: projectData.status || ProjectStatus.ACTIVE,
    owner: projectData.owner,
    members: projectData.members || [],
    tags: projectData.tags || [],
  });

  const savedProject = await projectRepository.save(project);

  logger.info('Project created', {
    type: 'project_created',
    projectId: savedProject.id,
    name: savedProject.name,
    status: savedProject.status,
    owner: savedProject.owner,
    memberCount: savedProject.members?.length || 0,
    duration: Date.now() - startTime,
  });

  try {
    await publishProjectCreated(savedProject.id, {
      name: savedProject.name,
      description: savedProject.description || '',
      status: savedProject.status,
      owner: savedProject.owner || null,
      tags: savedProject.tags || [],
    });
    logger.info('Event published - project.created', {
      type: 'event_published',
      eventType: 'project.created',
      projectId: savedProject.id,
    });
  } catch (error) {
    logger.error('Failed to publish project.created event', {
      type: 'event_publish_failed',
      eventType: 'project.created',
      projectId: savedProject.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return savedProject;
};

export const updateProject = async (id: string, updateData: UpdateProjectDTO): Promise<Project> => {
  const startTime = Date.now();
  const projectRepository = getProjectRepository();
  const project = await getProjectById(id);

  const oldStatus = project.status;

  Object.assign(project, updateData);
  const savedProject = await projectRepository.save(project);

  // Log status change
  if (updateData.status && updateData.status !== oldStatus) {
    logger.info('Project status changed', {
      type: 'project_status_changed',
      projectId: savedProject.id,
      oldStatus,
      newStatus: savedProject.status,
    });
  }

  logger.info('Project updated', {
    type: 'project_updated',
    projectId: savedProject.id,
    name: savedProject.name,
    duration: Date.now() - startTime,
  });

  return savedProject;
};

export const deleteProject = async (id: string): Promise<void> => {
  const startTime = Date.now();
  const projectRepository = getProjectRepository();
  const project = await getProjectById(id);

  await projectRepository.remove(project);

  logger.info('Project deleted', {
    type: 'project_deleted',
    projectId: id,
    name: project.name,
    duration: Date.now() - startTime,
  });
};

export const addMember = async (id: string, memberId: string): Promise<Project> => {
  const project = await getProjectById(id);
  const members = project.members || [];

  if (!members.includes(memberId)) {
    members.push(memberId);
    const updatedProject = await updateProject(id, { members });

    logger.info('Project member added', {
      type: 'project_member_added',
      projectId: id,
      memberId,
      totalMembers: members.length,
    });

    return updatedProject;
  }

  logger.debug('Member already exists in project', {
    type: 'project_member_exists',
    projectId: id,
    memberId,
  });

  return project;
};

export const removeMember = async (id: string, memberId: string): Promise<Project> => {
  const project = await getProjectById(id);
  const originalCount = project.members?.length || 0;
  const members = (project.members || []).filter((m) => m !== memberId);

  const updatedProject = await updateProject(id, { members });

  if (members.length < originalCount) {
    logger.info('Project member removed', {
      type: 'project_member_removed',
      projectId: id,
      memberId,
      totalMembers: members.length,
    });
  }

  return updatedProject;
};

export const getProjectStatistics = async () => {
  const projectRepository = getProjectRepository();
  const [total, active, archived, onHold, completed] = await Promise.all([
    projectRepository.count(),
    projectRepository.count({ where: { status: ProjectStatus.ACTIVE } }),
    projectRepository.count({ where: { status: ProjectStatus.ARCHIVED } }),
    projectRepository.count({ where: { status: ProjectStatus.ON_HOLD } }),
    projectRepository.count({ where: { status: ProjectStatus.COMPLETED } }),
  ]);

  return {
    total,
    byStatus: { active, archived, onHold, completed },
  };
};

export const getProjectMembers = async (id: string) => {
  const project = await getProjectById(id);
  return {
    owner: project.owner,
    members: project.members || [],
  };
};

export const getProjectGrpc = async (
  call: GrpcServerCall<GetProjectRequest>,
  callback: GrpcCallback<GetProjectResponse>,
) => {
  try {
    const { project_id } = call.request;

    if (!project_id) {
      const error = new Error('project_id is required') as grpc.ServiceError;
      error.code = grpc.status.INVALID_ARGUMENT;
      return callback(error as unknown as grpc.ServiceError);
    }

    const project = await getProjectById(project_id);

    callback(null, {
      id: project.id,
      name: project.name,
      description: project.description || '',
      status: project.status,
      owner: project.owner || '',
      members: project.members || [],
      tags: project.tags || [],
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error('gRPC GetProject error:', error);

    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode === 404) {
      const grpcError = new Error(err.message || 'Project not found') as grpc.ServiceError;
      grpcError.code = grpc.status.NOT_FOUND;
      return callback(grpcError as unknown as grpc.ServiceError);
    }

    const grpcError = new Error('Failed to fetch project') as grpc.ServiceError;
    grpcError.code = grpc.status.INTERNAL;
    callback(grpcError as unknown as grpc.ServiceError);
  }
};

export const validateProjectAccessGrpc = async (
  call: GrpcServerCall<ValidateProjectAccessRequest>,
  callback: GrpcCallback<ValidateProjectAccessResponse>,
) => {
  try {
    const { project_id, user_id } = call.request;

    if (!project_id || !user_id) {
      const error = new Error('project_id and user_id are required') as grpc.ServiceError;
      error.code = grpc.status.INVALID_ARGUMENT;
      return callback(error as unknown as grpc.ServiceError);
    }

    const project = await getProjectById(project_id);
    const hasAccess =
      project.owner === user_id || (project.members ? project.members.includes(user_id) : false);

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

    const grpcError = new Error('Failed to validate project access') as grpc.ServiceError;
    grpcError.code = grpc.status.INTERNAL;
    callback(grpcError as unknown as grpc.ServiceError);
  }
};

export const handleTaskCreated = async (event: Record<string, unknown>, _metadata: unknown) => {
  logger.info('Event received - task.created', {
    type: 'event_received',
    eventType: 'task.created',
    projectId: event.projectId,
    taskId: event.taskId,
    title: event.title,
  });
};

export const handleTaskDeleted = async (event: Record<string, unknown>, _metadata: unknown) => {
  logger.info('Event received - task.deleted', {
    type: 'event_received',
    eventType: 'task.deleted',
    projectId: event.projectId,
    taskId: event.taskId,
  });
};
