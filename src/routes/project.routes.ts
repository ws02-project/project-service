import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import validate from '../middlewares/validate';
import * as projectValidation from '../validations/project.validation';

const router: Router = Router();

router
  .route('/')
  .get(projectController.getAllProjects)
  .post(validate(projectValidation.createProjectSchema), projectController.createProject);

router.route('/statistics').get(projectController.getStatistics);

router
  .route('/:id')
  .get(validate(projectValidation.getProjectSchema), projectController.getProjectById)
  .patch(validate(projectValidation.updateProjectSchema), projectController.updateProject)
  .delete(validate(projectValidation.deleteProjectSchema), projectController.deleteProject);

router
  .route('/:id/members')
  .post(validate(projectValidation.addMemberSchema), projectController.addMember)
  .delete(validate(projectValidation.removeMemberSchema), projectController.removeMember);

export default router;
