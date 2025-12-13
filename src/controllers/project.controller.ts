import { Request, Response, RequestHandler } from 'express';
import httpStatus from 'http-status';
import * as projectService from '../services/project.service';
import catchAsync from '../utils/catchAsync';

export const getAllProjects: RequestHandler = catchAsync(async (_req: Request, res: Response) => {
  const projects = await projectService.getAllProjects();
  res.status(httpStatus.OK).json({
    success: true,
    data: projects,
  });
});

export const getProjectById: RequestHandler = catchAsync(async (req: Request, res: Response) => {
  const project = await projectService.getProjectById(req.params.id);
  res.status(httpStatus.OK).json({
    success: true,
    data: project,
  });
});

export const createProject: RequestHandler = catchAsync(async (req: Request, res: Response) => {
  const project = await projectService.createProject(req.body);
  res.status(httpStatus.CREATED).json({
    success: true,
    data: project,
  });
});

export const updateProject: RequestHandler = catchAsync(async (req: Request, res: Response) => {
  const project = await projectService.updateProject(req.params.id, req.body);
  res.status(httpStatus.OK).json({
    success: true,
    data: project,
  });
});

export const deleteProject: RequestHandler = catchAsync(async (req: Request, res: Response) => {
  await projectService.deleteProject(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

export const addMember: RequestHandler = catchAsync(async (req: Request, res: Response) => {
  const project = await projectService.addMember(req.params.id, req.body.memberId);
  res.status(httpStatus.OK).json({
    success: true,
    data: project,
  });
});

export const removeMember: RequestHandler = catchAsync(async (req: Request, res: Response) => {
  const project = await projectService.removeMember(req.params.id, req.body.memberId);
  res.status(httpStatus.OK).json({
    success: true,
    data: project,
  });
});

export const getStatistics: RequestHandler = catchAsync(async (_req: Request, res: Response) => {
  const statistics = await projectService.getProjectStatistics();
  res.status(httpStatus.OK).json({
    success: true,
    data: statistics,
  });
});
