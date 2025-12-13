import { Request, Response } from 'express';
import httpStatus from 'http-status';
import Joi from 'joi';
import validate from '../../../middlewares/validate';

describe('Validate Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      query: {},
      params: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  it('should pass validation when data is valid', () => {
    const schema = {
      body: Joi.object({
        name: Joi.string().required(),
      }),
    };

    mockReq.body = { name: 'Test Project' };

    const middleware = validate(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should fail validation when required field is missing', () => {
    const schema = {
      body: Joi.object({
        name: Joi.string().required(),
      }),
    };

    mockReq.body = {};

    const middleware = validate(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: httpStatus.BAD_REQUEST,
      }),
    );
  });

  it('should validate params', () => {
    const schema = {
      params: Joi.object({
        id: Joi.string().uuid().required(),
      }),
    };

    mockReq.params = { id: 'not-a-uuid' };

    const middleware = validate(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: httpStatus.BAD_REQUEST,
      }),
    );
  });

  it('should validate query', () => {
    const schema = {
      query: Joi.object({
        page: Joi.number().integer().min(1),
      }),
    };

    mockReq.query = { page: '0' as unknown as string };

    const middleware = validate(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: httpStatus.BAD_REQUEST,
      }),
    );
  });

  it('should allow valid UUID params', () => {
    const schema = {
      params: Joi.object({
        id: Joi.string().uuid().required(),
      }),
    };

    mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

    const middleware = validate(schema);
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });
});
