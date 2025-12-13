import { Repository } from 'typeorm';
import * as grpc from '@grpc/grpc-js';
import { Project, ProjectStatus } from '../../../models/project.model';
import * as projectService from '../../../services/project.service';
import { AppDataSource } from '../../../config/database';
import logger from '../../../utils/logger';
import * as messaging from '../../../messaging';

// Mock dependencies
jest.mock('../../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../messaging', () => ({
  publishProjectCreated: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const mockedLogger = jest.mocked(logger);
const mockedMessaging = jest.mocked(messaging);

describe('Project Service - Extended Tests', () => {
  let mockRepository: jest.Mocked<Repository<Project>>;

  const createMockProject = (overrides: Partial<Project> = {}): Project => ({
    id: 'project-uuid-1234',
    name: 'Test Project',
    description: 'Test Description',
    status: ProjectStatus.ACTIVE,
    owner: 'user-123',
    members: ['user-456', 'user-789'],
    tags: ['frontend', 'react'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<Repository<Project>>;

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);
  });

  describe('getAllProjects', () => {
    it('should return all projects ordered by createdAt DESC', async () => {
      const projects = [createMockProject()];
      mockRepository.find.mockResolvedValue(projects);

      const result = await projectService.getAllProjects();

      expect(result).toEqual(projects);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getProjectById', () => {
    it('should return project when found', async () => {
      const project = createMockProject();
      mockRepository.findOne.mockResolvedValue(project);

      const result = await projectService.getProjectById('project-uuid-1234');

      expect(result).toEqual(project);
    });

    it('should throw 404 when project not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(projectService.getProjectById('nonexistent')).rejects.toThrow(
        'Project not found',
      );
    });
  });

  describe('getProjectsByStatus', () => {
    it('should return projects by status', async () => {
      const projects = [createMockProject({ status: ProjectStatus.COMPLETED })];
      mockRepository.find.mockResolvedValue(projects);

      const result = await projectService.getProjectsByStatus(ProjectStatus.COMPLETED);

      expect(result).toEqual(projects);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { status: ProjectStatus.COMPLETED },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getProjectsByOwner', () => {
    it('should return projects by owner', async () => {
      const projects = [createMockProject({ owner: 'user-123' })];
      mockRepository.find.mockResolvedValue(projects);

      const result = await projectService.getProjectsByOwner('user-123');

      expect(result).toEqual(projects);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { owner: 'user-123' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('createProject', () => {
    it('should create project and publish event', async () => {
      const projectData = {
        name: 'New Project',
        description: 'New Description',
        owner: 'user-123',
      };
      const savedProject = createMockProject(projectData);

      mockRepository.create.mockReturnValue(savedProject);
      mockRepository.save.mockResolvedValue(savedProject);

      const result = await projectService.createProject(projectData);

      expect(result).toEqual(savedProject);
      expect(mockedMessaging.publishProjectCreated).toHaveBeenCalled();
    });

    it('should handle event publish failure gracefully', async () => {
      mockedMessaging.publishProjectCreated.mockRejectedValue(new Error('Publish failed'));

      const projectData = { name: 'New Project' };
      const savedProject = createMockProject(projectData);

      mockRepository.create.mockReturnValue(savedProject);
      mockRepository.save.mockResolvedValue(savedProject);

      // Should not throw
      const result = await projectService.createProject(projectData);
      expect(result).toEqual(savedProject);
    });
  });

  describe('updateProject', () => {
    it('should update project', async () => {
      const project = createMockProject();
      const updateData = { name: 'Updated Project' };
      const updatedProject = { ...project, ...updateData };

      mockRepository.findOne.mockResolvedValue(project);
      mockRepository.save.mockResolvedValue(updatedProject);

      const result = await projectService.updateProject('project-uuid-1234', updateData);

      expect(result.name).toBe('Updated Project');
    });

    it('should log status change', async () => {
      const project = createMockProject({ status: ProjectStatus.ACTIVE });
      const updateData = { status: ProjectStatus.COMPLETED };
      const updatedProject = { ...project, ...updateData };

      mockRepository.findOne.mockResolvedValue(project);
      mockRepository.save.mockResolvedValue(updatedProject);

      await projectService.updateProject('project-uuid-1234', updateData);

      expect(mockedLogger.info).toHaveBeenCalledWith('Project status changed', expect.any(Object));
    });
  });

  describe('deleteProject', () => {
    it('should delete project', async () => {
      const project = createMockProject();
      mockRepository.findOne.mockResolvedValue(project);
      mockRepository.remove.mockResolvedValue(project);

      await projectService.deleteProject('project-uuid-1234');

      expect(mockRepository.remove).toHaveBeenCalledWith(project);
    });
  });

  describe('addMember', () => {
    it('should add new member to project', async () => {
      const project = createMockProject({ members: ['user-456'] });
      const updatedProject = createMockProject({ members: ['user-456', 'new-member'] });

      mockRepository.findOne.mockResolvedValue(project);
      mockRepository.save.mockResolvedValue(updatedProject);

      const result = await projectService.addMember('project-uuid-1234', 'new-member');

      expect(result.members).toContain('new-member');
    });

    it('should not duplicate existing member', async () => {
      const project = createMockProject({ members: ['user-456'] });
      mockRepository.findOne.mockResolvedValue(project);

      const result = await projectService.addMember('project-uuid-1234', 'user-456');

      expect(result).toEqual(project);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should remove member from project', async () => {
      const project = createMockProject({ members: ['user-456', 'user-789'] });
      const updatedProject = createMockProject({ members: ['user-789'] });

      mockRepository.findOne.mockResolvedValue(project);
      mockRepository.save.mockResolvedValue(updatedProject);

      const result = await projectService.removeMember('project-uuid-1234', 'user-456');

      expect(result.members).not.toContain('user-456');
    });
  });

  describe('getProjectStatistics', () => {
    it('should return statistics', async () => {
      mockRepository.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(30) // active
        .mockResolvedValueOnce(10) // archived
        .mockResolvedValueOnce(5) // on_hold
        .mockResolvedValueOnce(5); // completed

      const result = await projectService.getProjectStatistics();

      expect(result).toEqual({
        total: 50,
        byStatus: { active: 30, archived: 10, onHold: 5, completed: 5 },
      });
    });
  });

  describe('getProjectMembers', () => {
    it('should return project members', async () => {
      const project = createMockProject({ owner: 'owner-1', members: ['m1', 'm2'] });
      mockRepository.findOne.mockResolvedValue(project);

      const result = await projectService.getProjectMembers('project-uuid-1234');

      expect(result).toEqual({
        owner: 'owner-1',
        members: ['m1', 'm2'],
      });
    });
  });

  describe('gRPC handlers', () => {
    describe('getProjectGrpc', () => {
      it('should return project when found', async () => {
        const project = createMockProject();
        mockRepository.findOne.mockResolvedValue(project);
        const callback = jest.fn();

        await projectService.getProjectGrpc(
          { request: { project_id: 'project-uuid-1234' } },
          callback,
        );

        expect(callback).toHaveBeenCalledWith(
          null,
          expect.objectContaining({
            id: project.id,
            name: project.name,
          }),
        );
      });

      it('should return error when project_id is missing', async () => {
        const callback = jest.fn();

        await projectService.getProjectGrpc({ request: { project_id: '' } }, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({ code: grpc.status.INVALID_ARGUMENT }),
        );
      });

      it('should return NOT_FOUND when project does not exist', async () => {
        mockRepository.findOne.mockResolvedValue(null);
        const callback = jest.fn();

        await projectService.getProjectGrpc({ request: { project_id: 'nonexistent' } }, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({ code: grpc.status.NOT_FOUND }),
        );
      });
    });

    describe('validateProjectAccessGrpc', () => {
      it('should return true when user is owner', async () => {
        const project = createMockProject({ owner: 'user-123', members: [] });
        mockRepository.findOne.mockResolvedValue(project);
        const callback = jest.fn();

        await projectService.validateProjectAccessGrpc(
          {
            request: { project_id: 'project-uuid-1234', user_id: 'user-123' },
          },
          callback,
        );

        expect(callback).toHaveBeenCalledWith(
          null,
          expect.objectContaining({
            has_access: true,
          }),
        );
      });

      it('should return true when user is member', async () => {
        const project = createMockProject({ owner: 'owner-1', members: ['user-123'] });
        mockRepository.findOne.mockResolvedValue(project);
        const callback = jest.fn();

        await projectService.validateProjectAccessGrpc(
          {
            request: { project_id: 'project-uuid-1234', user_id: 'user-123' },
          },
          callback,
        );

        expect(callback).toHaveBeenCalledWith(
          null,
          expect.objectContaining({
            has_access: true,
          }),
        );
      });

      it('should return false when user has no access', async () => {
        const project = createMockProject({ owner: 'owner-1', members: ['other-user'] });
        mockRepository.findOne.mockResolvedValue(project);
        const callback = jest.fn();

        await projectService.validateProjectAccessGrpc(
          {
            request: { project_id: 'project-uuid-1234', user_id: 'user-123' },
          },
          callback,
        );

        expect(callback).toHaveBeenCalledWith(
          null,
          expect.objectContaining({
            has_access: false,
          }),
        );
      });

      it('should return error when project_id or user_id is missing', async () => {
        const callback = jest.fn();

        await projectService.validateProjectAccessGrpc(
          {
            request: { project_id: '', user_id: 'user-123' },
          },
          callback,
        );

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({ code: grpc.status.INVALID_ARGUMENT }),
        );
      });

      it('should return false when project not found', async () => {
        mockRepository.findOne.mockResolvedValue(null);
        const callback = jest.fn();

        await projectService.validateProjectAccessGrpc(
          {
            request: { project_id: 'nonexistent', user_id: 'user-123' },
          },
          callback,
        );

        expect(callback).toHaveBeenCalledWith(
          null,
          expect.objectContaining({
            has_access: false,
          }),
        );
      });
    });
  });

  describe('Event handlers', () => {
    describe('handleTaskCreated', () => {
      it('should log task created event', async () => {
        const event = { projectId: 'project-123', taskId: 'task-456', title: 'New Task' };

        await projectService.handleTaskCreated(event, {});

        expect(mockedLogger.info).toHaveBeenCalledWith(
          'Event received - task.created',
          expect.any(Object),
        );
      });
    });

    describe('handleTaskDeleted', () => {
      it('should log task deleted event', async () => {
        const event = { projectId: 'project-123', taskId: 'task-456' };

        await projectService.handleTaskDeleted(event, {});

        expect(mockedLogger.info).toHaveBeenCalledWith(
          'Event received - task.deleted',
          expect.any(Object),
        );
      });
    });
  });
});
