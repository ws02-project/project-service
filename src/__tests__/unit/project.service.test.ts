import { Repository } from 'typeorm';
import { Project, ProjectStatus } from '../../models/project.model';
import * as projectService from '../../services/project.service';
import { AppDataSource } from '../../config/database';

// Mock dependencies
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../messaging', () => ({
  publishProjectCreated: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Project Service', () => {
  let mockRepository: jest.Mocked<Repository<Project>>;
  let mockProject: Project;

  const createMockProject = (): Project => ({
    id: 'project-uuid-1234',
    name: 'Test Project',
    description: 'Test Description',
    status: ProjectStatus.ACTIVE,
    owner: 'user-123',
    members: ['user-456'],
    tags: ['test', 'demo'],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockProject = createMockProject();

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
      const projects = [mockProject];
      mockRepository.find.mockResolvedValue(projects);

      const result = await projectService.getAllProjects();

      expect(result).toEqual(projects);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no projects exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await projectService.getAllProjects();

      expect(result).toEqual([]);
    });
  });

  describe('getProjectById', () => {
    it('should return project when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockProject);

      const result = await projectService.getProjectById('project-uuid-1234');

      expect(result).toEqual(mockProject);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-uuid-1234' },
      });
    });

    it('should throw error when project not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(projectService.getProjectById('non-existent')).rejects.toThrow();
    });
  });

  describe('createProject', () => {
    it('should create project with default values', async () => {
      const createData = {
        name: 'New Project',
        description: 'New Description',
        owner: 'user-123',
      };

      mockRepository.create.mockReturnValue(mockProject);
      mockRepository.save.mockResolvedValue(mockProject);

      const result = await projectService.createProject(createData);

      expect(result).toEqual(mockProject);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createData.name,
          description: createData.description,
          status: ProjectStatus.ACTIVE,
        }),
      );
    });

    it('should create project with custom status', async () => {
      const createData = {
        name: 'On Hold Project',
        status: ProjectStatus.ON_HOLD,
        owner: 'user-123',
      };

      const customProject = { ...mockProject, ...createData };
      mockRepository.create.mockReturnValue(customProject);
      mockRepository.save.mockResolvedValue(customProject);

      const result = await projectService.createProject(createData);

      expect(result.status).toBe(ProjectStatus.ON_HOLD);
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      const updateData = { name: 'Updated Project Name' };
      const updatedProject = { ...mockProject, name: 'Updated Project Name' };

      mockRepository.findOne.mockResolvedValue(mockProject);
      mockRepository.save.mockResolvedValue(updatedProject);

      const result = await projectService.updateProject('project-uuid-1234', updateData);

      expect(result.name).toBe('Updated Project Name');
    });

    it('should throw error when updating non-existent project', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        projectService.updateProject('non-existent', { name: 'Test' }),
      ).rejects.toThrow();
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockProject);
      mockRepository.remove.mockResolvedValue(mockProject);

      await expect(projectService.deleteProject('project-uuid-1234')).resolves.not.toThrow();
      expect(mockRepository.remove).toHaveBeenCalledWith(mockProject);
    });

    it('should throw error when deleting non-existent project', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(projectService.deleteProject('non-existent')).rejects.toThrow();
    });
  });

  describe('addMember', () => {
    it('should add member to project', async () => {
      const updatedProject = {
        ...mockProject,
        members: ['user-456', 'user-789'],
      };

      mockRepository.findOne.mockResolvedValue(mockProject);
      mockRepository.save.mockResolvedValue(updatedProject);

      const result = await projectService.addMember('project-uuid-1234', 'user-789');

      expect(result.members).toContain('user-789');
    });

    it('should not duplicate existing member', async () => {
      mockRepository.findOne.mockResolvedValue(mockProject);

      const result = await projectService.addMember('project-uuid-1234', 'user-456');

      expect(result.members).toEqual(['user-456']);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should remove member from project', async () => {
      const updatedProject = {
        ...mockProject,
        members: [],
      };

      mockRepository.findOne.mockResolvedValue(mockProject);
      mockRepository.save.mockResolvedValue(updatedProject);

      const result = await projectService.removeMember('project-uuid-1234', 'user-456');

      expect(result.members).not.toContain('user-456');
    });
  });

  describe('getProjectStatistics', () => {
    it('should return correct statistics', async () => {
      mockRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // active
        .mockResolvedValueOnce(2) // archived
        .mockResolvedValueOnce(1) // on_hold
        .mockResolvedValueOnce(2); // completed

      const result = await projectService.getProjectStatistics();

      expect(result).toEqual({
        total: 10,
        byStatus: {
          active: 5,
          archived: 2,
          onHold: 1,
          completed: 2,
        },
      });
    });
  });

  describe('getProjectsByStatus', () => {
    it('should return projects filtered by status', async () => {
      const activeProjects = [mockProject];
      mockRepository.find.mockResolvedValue(activeProjects);

      const result = await projectService.getProjectsByStatus(ProjectStatus.ACTIVE);

      expect(result).toEqual(activeProjects);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { status: ProjectStatus.ACTIVE },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getProjectMembers', () => {
    it('should return project owner and members', async () => {
      mockRepository.findOne.mockResolvedValue(mockProject);

      const result = await projectService.getProjectMembers('project-uuid-1234');

      expect(result).toEqual({
        owner: 'user-123',
        members: ['user-456'],
      });
    });
  });
});
