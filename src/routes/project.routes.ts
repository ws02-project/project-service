import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import validate from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import * as projectValidation from '../validations/project.validation';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// List all projects - all authenticated users
// Create project - admin only
router
  .route('/')
  .get(projectController.getAllProjects)
  .post(
    authorize('admin'),
    validate(projectValidation.createProjectSchema),
    projectController.createProject,
  );

// Get statistics - all authenticated users
router.route('/statistics').get(projectController.getStatistics);

// Get project - all authenticated users
// Update project - admin only
// Delete project - admin only
router
  .route('/:id')
  .get(validate(projectValidation.getProjectSchema), projectController.getProjectById)
  .patch(
    authorize('admin'),
    validate(projectValidation.updateProjectSchema),
    projectController.updateProject,
  )
  .delete(
    authorize('admin'),
    validate(projectValidation.deleteProjectSchema),
    projectController.deleteProject,
  );

// Member management - admin only
router
  .route('/:id/members')
  .post(
    authorize('admin'),
    validate(projectValidation.addMemberSchema),
    projectController.addMember,
  )
  .delete(
    authorize('admin'),
    validate(projectValidation.removeMemberSchema),
    projectController.removeMember,
  );

export default router;
