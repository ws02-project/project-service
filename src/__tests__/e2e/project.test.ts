import request from 'supertest';
import app from '../../app';

describe('Project API Endpoints', () => {
  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'project-service');
    });
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'This is a test project',
        status: 'active',
        owner: 'testuser',
      };

      const res = await request(app).post('/api/v1/projects').send(projectData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe(projectData.name);
    });

    it('should fail with invalid project data', async () => {
      const res = await request(app).post('/api/v1/projects').send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should return all projects', async () => {
      const res = await request(app).get('/api/v1/projects');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should return a project by id', async () => {
      // First create a project
      const createRes = await request(app).post('/api/v1/projects').send({
        name: 'Test Project for GET',
        status: 'active',
      });

      const projectId = createRes.body.data.id;

      // Then retrieve it
      const res = await request(app).get(`/api/v1/projects/${projectId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(projectId);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app).get(`/api/v1/projects/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    it('should update a project', async () => {
      // Create a project
      const createRes = await request(app).post('/api/v1/projects').send({
        name: 'Original Name',
        status: 'active',
      });

      const projectId = createRes.body.data.id;

      // Update it
      const updateData = {
        name: 'Updated Name',
        status: 'completed',
      };

      const res = await request(app).patch(`/api/v1/projects/${projectId}`).send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updateData.name);
      expect(res.body.data.status).toBe(updateData.status);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should delete a project', async () => {
      // Create a project
      const createRes = await request(app).post('/api/v1/projects').send({
        name: 'Project to Delete',
        status: 'active',
      });

      const projectId = createRes.body.data.id;

      // Delete it
      const res = await request(app).delete(`/api/v1/projects/${projectId}`);

      expect(res.status).toBe(204);
    });
  });

  describe('POST /api/v1/projects/:id/members', () => {
    it('should add a member to project', async () => {
      // Create a project
      const createRes = await request(app).post('/api/v1/projects').send({
        name: 'Team Project',
        status: 'active',
      });

      const projectId = createRes.body.data.id;

      // Add member
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .send({ memberId: 'user123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.members).toContain('user123');
    });
  });

  describe('DELETE /api/v1/projects/:id/members', () => {
    it('should remove a member from project', async () => {
      // Create a project with a member
      const createRes = await request(app)
        .post('/api/v1/projects')
        .send({
          name: 'Team Project',
          status: 'active',
          members: ['user123', 'user456'],
        });

      const projectId = createRes.body.data.id;

      // Remove member
      const res = await request(app)
        .delete(`/api/v1/projects/${projectId}/members`)
        .send({ memberId: 'user123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.members).not.toContain('user123');
      expect(res.body.data.members).toContain('user456');
    });
  });

  describe('GET /api/v1/projects/statistics', () => {
    it('should return project statistics', async () => {
      const res = await request(app).get('/api/v1/projects/statistics');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('byStatus');
    });
  });
});
