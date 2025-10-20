import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import httpStatus from 'http-status';
import createApiError from '../utils/ApiError';

const validate = (schema: Record<string, Joi.Schema>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const validSchema = Object.keys(schema).reduce(
      (acc, key) => {
        if (['params', 'query', 'body'].includes(key)) {
          acc[key] = req[key as keyof Pick<Request, 'params' | 'query' | 'body'>];
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );

    const { value, error } = Joi.compile(schema)
      .prefs({ errors: { label: 'key' }, abortEarly: false })
      .validate(validSchema);

    if (error) {
      const errorMessage = error.details.map((details) => details.message).join(', ');
      return next(createApiError(httpStatus.BAD_REQUEST, errorMessage));
    }

    Object.assign(req, value);
    return next();
  };
};

export default validate;
