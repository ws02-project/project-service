import { Request, Response } from 'express';
import httpStatus from 'http-status';
import * as projectController from '../../../controllers/project.controller';
import * as projectService from '../../../services/project.service';
import { Project, ProjectStatus } from '../../../models/project.model';

// Mock the service layer
jest.mock('../../../services/project.service');

const mockedProjectService = projectService as jest.Mocked<typeof projectService>;

describe('Project Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

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

    mockReq = {
      params: {},
      body: {},
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getAllProjects', () => {
    it('should return all projects with 200 status', async () => {
      const projects = [createMockProject(), createMockProject({ id: 'project-2' })];
      mockedProjectService.getAllProjects.mockResolvedValue(projects);

      await projectController.getAllProjects(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedProjectService.getAllProjects).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: projects,
      });
    });

    it('should return empty array when no projects', async () => {
      mockedProjectService.getAllProjects.mockResolvedValue([]);

      await projectController.getAllProjects(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
      });
    });
  });

  describe('getProjectById', () => {
    it('should return project with 200 status', async () => {
      const project = createMockProject();
      mockReq.params = { id: 'project-uuid-1234' };
      mockedProjectService.getProjectById.mockResolvedValue(project);

      await projectController.getProjectById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedProjectService.getProjectById).toHaveBeenCalledWith('project-uuid-1234');
      expect(mockRes.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: project,
      });
    });
  });

  describe('createProject', () => {
    it('should create project and return 201 status', async () => {
      const createData = {
        name: 'New Project',
        description: 'New Description',
        owner: 'user-123',
      };
      mockReq.body = createData;
      const createdProject = createMockProject(createData);
      mockedProjectService.createProject.mockResolvedValue(createdProject);

      await projectController.createProject(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedProjectService.createProject).toHaveBeenCalledWith(createData);
      expect(mockRes.status).toHaveBeenCalledWith(httpStatus.CREATED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: createdProject,
      });
    });
  });

  describe('updateProject', () => {
    it('should update project and return 200 status', async () => {
      const updateData = { name: 'Updated Project', status: ProjectStatus.COMPLETED };
      mockReq.params = { id: 'project-uuid-1234' };
      mockReq.body = updateData;
      const updatedProject = createMockProject({ ...updateData });
      mockedProjectService.updateProject.mockResolvedValue(updatedProject);

      await projectController.updateProject(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedProjectService.updateProject).toHaveBeenCalledWith(
        'project-uuid-1234',
        updateData,
      );
      expect(mockRes.status).toHaveBeenCalledWith(httpStatus.OK);
    });
  });

  describe('deleteProject', () => {
    it('should delete project and return 204 status', async () => {
      mockReq.params = { id: 'project-uuid-1234' };
      mockedProjectService.deleteProject.mockResolvedValue();

      await projectController.deleteProject(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedProjectService.deleteProject).toHaveBeenCalledWith('project-uuid-1234');
      expect(mockRes.status).toHaveBeenCalledWith(httpStatus.NO_CONTENT);
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  describe('addMember', () => {
    it('should add member and return 200 status', async () => {
      mockReq.params = { id: 'project-uuid-1234' };
      mockReq.body = { memberId: 'new-member-123' };
      const updatedProject = createMockProject({
        members: ['user-456', 'user-789', 'new-member-123'],
      });
      mockedProjectService.addMember.mockResolvedValue(updatedProject);

      await projectController.addMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedProjectService.addMember).toHaveBeenCalledWith(
        'project-uuid-1234',
        'new-member-123',
      );
      expect(mockRes.status).toHaveBeenCalledWith(httpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedProject,
      });
    });
  });

  describe('removeMember', () => {
    it('should remove member and return 200 status', async () => {
      mockReq.params = { id: 'project-uuid-1234' };
      mockReq.body = { memberId: 'user-456' };
      const updatedProject = createMockProject({ members: ['user-789'] });
      mockedProjectService.removeMember.mockResolvedValue(updatedProject);

      await projectController.removeMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedProjectService.removeMember).toHaveBeenCalledWith(
        'project-uuid-1234',
        'user-456',
      );
      expect(mockRes.status).toHaveBeenCalledWith(httpStatus.OK);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      const stats = {
        total: 50,
        byStatus: { active: 30, archived: 10, onHold: 5, completed: 5 },
      };
      mockedProjectService.getProjectStatistics.mockResolvedValue(stats);

      await projectController.getStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedProjectService.getProjectStatistics).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: stats,
      });
    });
  });
});
