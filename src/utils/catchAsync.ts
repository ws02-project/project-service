import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async route handlers to catch rejected promises and pass errors to Express error handler
 *
 * @param fn - Async route handler function
 * @returns Wrapped function that forwards errors to next()
 *
 * @example
 * router.get('/projects', catchAsync(async (req, res) => {
 *   const projects = await projectService.getAllProjects();
 *   res.json({ success: true, data: projects });
 * }));
 */
const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default catchAsync;
