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

// Helper to get repository
const getProjectRepository = (): Repository<Project> => AppDataSource.getRepository(Project);

/**
 * Get all projects
 */
export const getAllProjects = async (): Promise<Project[]> => {
  const projectRepository = getProjectRepository();
  return await projectRepository.find({
    order: {
      createdAt: 'DESC',
    },
  });
};

/**
 * Get project by ID
 */
export const getProjectById = async (id: string): Promise<Project> => {
  const projectRepository = getProjectRepository();
  const project = await projectRepository.findOne({
    where: { id },
  });

  if (!project) {
    throw createApiError(httpStatus.NOT_FOUND, 'Project not found');
  }

  return project;
};

/**
 * Get projects by status
 */
export const getProjectsByStatus = async (status: ProjectStatus): Promise<Project[]> => {
  const projectRepository = getProjectRepository();
  return await projectRepository.find({
    where: { status },
    order: {
      createdAt: 'DESC',
    },
  });
};

/**
 * Get projects by owner
 */
export const getProjectsByOwner = async (owner: string): Promise<Project[]> => {
  const projectRepository = getProjectRepository();
  return await projectRepository.find({
    where: { owner },
    order: {
      createdAt: 'DESC',
    },
  });
};

/**
 * Create a new project
 */
export const createProject = async (projectData: CreateProjectDTO): Promise<Project> => {
  const projectRepository = getProjectRepository();
  const project = projectRepository.create({
    name: projectData.name,
    description: projectData.description,
    status: projectData.status || ProjectStatus.ACTIVE,
    owner: projectData.owner,
    members: projectData.members || [],
    tags: projectData.tags || [],
  });

  return await projectRepository.save(project);
};

/**
 * Update a project
 */
export const updateProject = async (id: string, updateData: UpdateProjectDTO): Promise<Project> => {
  const projectRepository = getProjectRepository();
  const project = await getProjectById(id);

  // Merge update data with existing project
  Object.assign(project, updateData);

  return await projectRepository.save(project);
};

/**
 * Delete a project
 */
export const deleteProject = async (id: string): Promise<void> => {
  const projectRepository = getProjectRepository();
  const project = await getProjectById(id);
  await projectRepository.remove(project);
};

/**
 * Add member to project
 */
export const addMember = async (id: string, memberId: string): Promise<Project> => {
  const project = await getProjectById(id);
  const members = project.members || [];

  if (!members.includes(memberId)) {
    members.push(memberId);
    return await updateProject(id, { members });
  }

  return project;
};

/**
 * Remove member from project
 */
export const removeMember = async (id: string, memberId: string): Promise<Project> => {
  const project = await getProjectById(id);
  const members = (project.members || []).filter((m) => m !== memberId);
  return await updateProject(id, { members });
};

/**
 * Get project statistics
 */
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
    byStatus: {
      active,
      archived,
      onHold,
      completed,
    },
  };
};

/**
 * Get project members (owner + members list)
 */
export const getProjectMembers = async (id: string) => {
  const project = await getProjectById(id);

  return {
    owner: project.owner,
    members: project.members || [],
  };
};
