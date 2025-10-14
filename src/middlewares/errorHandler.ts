import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { config, isProduction } from '../config';
import logger from '../utils/logger';
import createApiError, { ApiErrorType } from '../utils/ApiError';

const isApiError = (error: unknown): error is ApiErrorType => {
  return (
    error !== null &&
    typeof error === 'object' &&
    'statusCode' in error &&
    'isOperational' in error &&
    typeof (error as ApiErrorType).statusCode === 'number' &&
    typeof (error as ApiErrorType).isOperational === 'boolean'
  );
};

export const errorConverter = (err: unknown, _req: Request, _res: Response, next: NextFunction) => {
  let error = err;
  if (!isApiError(error)) {
    const statusCode =
      (error as { statusCode?: number }).statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = (error as { message?: string }).message || 'Internal Server Error';
    const stack = (error as { stack?: string }).stack;
    error = createApiError(statusCode, message, false, stack || '');
  }
  next(error);
};

export const errorHandler = (
  err: ApiErrorType,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let { statusCode, message } = err;

  if (isProduction && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack }),
  };

  if (config.env === 'development') {
    logger.error(err);
  }

  res.status(statusCode).json(response);
};
