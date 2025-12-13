import request from 'supertest';
import express from 'express';
import httpStatus from 'http-status';

// Create a mock app for testing
const createMockApp = () => {
  const app = express();
  app.use(express.json());

  // Mock project data
  const projects: Record<string, unknown>[] = [
    {
      id: 'project-1',
      name: 'Test Project 1',
      description: 'Description 1',
      status: 'active',
      owner: 'user-1',
      members: ['user-2'],
      tags: ['test'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Health check
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', service: 'project-service' });
  });

  // Get all projects
  app.get('/api/v1/projects', (_req, res) => {
    res.json({ success: true, data: projects });
  });

  // Get project by ID
  app.get('/api/v1/projects/:id', (req, res) => {
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }
    res.json({ success: true, data: project });
  });

  // Create project
  app.post('/api/v1/projects', (req, res) => {
    if (!req.body.name) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Name is required',
      });
      return;
    }

    const newProject = {
      id: `project-${Date.now()}`,
      ...req.body,
      status: req.body.status || 'active',
      members: req.body.members || [],
      tags: req.body.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projects.push(newProject);
    res.status(httpStatus.CREATED).json({ success: true, data: newProject });
  });

  // Update project
  app.patch('/api/v1/projects/:id', (req, res) => {
    const projectIndex = projects.findIndex((p) => p.id === req.params.id);
    if (projectIndex === -1) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    projects[projectIndex] = {
      ...projects[projectIndex],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    res.json({ success: true, data: projects[projectIndex] });
  });

  // Delete project
  app.delete('/api/v1/projects/:id', (req, res) => {
    const projectIndex = projects.findIndex((p) => p.id === req.params.id);
    if (projectIndex === -1) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    projects.splice(projectIndex, 1);
    res.status(httpStatus.NO_CONTENT).send();
  });

  // Add member
  app.post('/api/v1/projects/:id/members', (req, res) => {
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) {
      res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    if (!req.body.memberId) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'memberId is required',
      });
      return;
    }

    const members = project.members as string[];
    if (!members.includes(req.body.memberId)) {
      members.push(req.body.memberId);
    }
    res.json({ success: true, data: project });
  });

  // Get project statistics
  app.get('/api/v1/projects/statistics', (_req, res) => {
    res.json({
      success: true,
      data: {
        total: projects.length,
        byStatus: {
          active: projects.filter((p) => p.status === 'active').length,
          archived: projects.filter((p) => p.status === 'archived').length,
          onHold: projects.filter((p) => p.status === 'on_hold').length,
          completed: projects.filter((p) => p.status === 'completed').length,
        },
      },
    });
  });

  return app;
};

describe('Project API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createMockApp();
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('project-service');
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should return all projects', async () => {
      const res = await request(app).get('/api/v1/projects');

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should return project by ID', async () => {
      const res = await request(app).get('/api/v1/projects/project-1');

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('project-1');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app).get('/api/v1/projects/non-existent');

      expect(res.status).toBe(httpStatus.NOT_FOUND);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const newProject = {
        name: 'New Test Project',
        description: 'New Description',
        owner: 'user-1',
      };

      const res = await request(app).post('/api/v1/projects').send(newProject);

      expect(res.status).toBe(httpStatus.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(newProject.name);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app).post('/api/v1/projects').send({
        description: 'No name provided',
      });

      expect(res.status).toBe(httpStatus.BAD_REQUEST);
      expect(res.body.success).toBe(false);
    });

    it('should set default values for optional fields', async () => {
      const res = await request(app).post('/api/v1/projects').send({
        name: 'Minimal Project',
      });

      expect(res.status).toBe(httpStatus.CREATED);
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.members).toEqual([]);
      expect(res.body.data.tags).toEqual([]);
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    it('should update an existing project', async () => {
      const updateData = {
        name: 'Updated Project Name',
        status: 'on_hold',
      };

      const res = await request(app).patch('/api/v1/projects/project-1').send(updateData);

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Project Name');
      expect(res.body.data.status).toBe('on_hold');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app).patch('/api/v1/projects/non-existent').send({
        name: 'Test',
      });

      expect(res.status).toBe(httpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should delete an existing project', async () => {
      // First create a project to delete
      const createRes = await request(app).post('/api/v1/projects').send({
        name: 'Project to Delete',
      });
      const projectId = createRes.body.data.id;

      const res = await request(app).delete(`/api/v1/projects/${projectId}`);

      expect(res.status).toBe(httpStatus.NO_CONTENT);

      // Verify project is deleted
      const getRes = await request(app).get(`/api/v1/projects/${projectId}`);
      expect(getRes.status).toBe(httpStatus.NOT_FOUND);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app).delete('/api/v1/projects/non-existent');

      expect(res.status).toBe(httpStatus.NOT_FOUND);
    });
  });

  describe('POST /api/v1/projects/:id/members', () => {
    it('should add member to project', async () => {
      const res = await request(app).post('/api/v1/projects/project-1/members').send({
        memberId: 'user-3',
      });

      expect(res.status).toBe(httpStatus.OK);
      expect(res.body.success).toBe(true);
      expect((res.body.data.members as string[]).includes('user-3')).toBe(true);
    });

    it('should return 400 when memberId is missing', async () => {
      const res = await request(app).post('/api/v1/projects/project-1/members').send({});

      expect(res.status).toBe(httpStatus.BAD_REQUEST);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app).post('/api/v1/projects/non-existent/members').send({
        memberId: 'user-3',
      });

      expect(res.status).toBe(httpStatus.NOT_FOUND);
    });
  });
});
