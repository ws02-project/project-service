import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { authenticate, authorize, optionalAuth } from '../../../middlewares/auth';
import * as userGrpcClient from '../../../grpc/clients/user.grpc.client';
import { UserRole, UserStatus } from '../../../grpc/clients/user.grpc.client';

// Mock the user gRPC client
jest.mock('../../../grpc/clients/user.grpc.client', () => ({
  validateToken: jest.fn(),
  roleToString: jest.fn((role: number) => {
    switch (role) {
      case 2:
        return 'admin';
      case 1:
        return 'user';
      default:
        return 'user';
    }
  }),
  UserRole: {
    UNSPECIFIED: 0,
    USER: 1,
    ADMIN: 2,
  },
  UserStatus: {
    UNSPECIFIED: 0,
    ACTIVE: 1,
    INACTIVE: 2,
    SUSPENDED: 3,
  },
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  const mockUser = {
    id: 'user-123',
    subject: 'sub-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    display_name: 'Test User',
    avatar_url: '',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    organization_id: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {},
  };

  const mockAdminUser = {
    ...mockUser,
    id: 'admin-123',
    role: UserRole.ADMIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {},
      path: '/test',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as Request['socket'],
      requestId: 'req-123',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should reject request without authorization header', async () => {
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.UNAUTHORIZED,
          message: 'No access token provided',
        }),
      );
    });

    it('should reject request with invalid authorization format', async () => {
      mockReq.headers = { authorization: 'InvalidFormat token123' };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.UNAUTHORIZED,
          message: 'No access token provided',
        }),
      );
    });

    it('should reject request when token validation fails', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      (userGrpcClient.validateToken as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
        scopes: [],
        expires_at: 0,
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.UNAUTHORIZED,
          message: 'Invalid or expired token',
        }),
      );
    });

    it('should reject request when user is suspended', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (userGrpcClient.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        user: { ...mockUser, status: UserStatus.SUSPENDED },
        scopes: [],
        expires_at: Date.now() + 3600000,
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.FORBIDDEN,
          message: 'User account is not active',
        }),
      );
    });

    it('should reject request when user is inactive', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (userGrpcClient.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        user: { ...mockUser, status: UserStatus.INACTIVE },
        scopes: [],
        expires_at: Date.now() + 3600000,
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.FORBIDDEN,
          message: 'User account is not active',
        }),
      );
    });

    it('should authenticate successfully with valid token', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (userGrpcClient.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
        scopes: ['read', 'write'],
        expires_at: Date.now() + 3600000,
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toEqual({
        id: mockUser.id,
        subject: mockUser.subject,
        email: mockUser.email,
        role: 'user',
      });
    });

    it('should authenticate admin user successfully', async () => {
      mockReq.headers = { authorization: 'Bearer admin-token' };
      (userGrpcClient.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockAdminUser,
        scopes: ['read', 'write', 'admin'],
        expires_at: Date.now() + 3600000,
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toEqual({
        id: mockAdminUser.id,
        subject: mockAdminUser.subject,
        email: mockAdminUser.email,
        role: 'admin',
      });
    });

    it('should handle gRPC service unavailable error', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      const grpcError = new Error('Service unavailable') as Error & { code: number };
      grpcError.code = 14; // UNAVAILABLE
      (userGrpcClient.validateToken as jest.Mock).mockRejectedValue(grpcError);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.SERVICE_UNAVAILABLE,
          message: 'Authentication service unavailable',
        }),
      );
    });
  });

  describe('authorize', () => {
    it('should reject if user is not authenticated', () => {
      const middleware = authorize('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.UNAUTHORIZED,
          message: 'Not authenticated',
        }),
      );
    });

    it('should reject if user does not have required role', () => {
      mockReq.user = {
        id: 'user-123',
        subject: 'sub-123',
        email: 'test@example.com',
        role: 'user',
      };

      const middleware = authorize('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: httpStatus.FORBIDDEN,
          message: 'Insufficient permissions',
        }),
      );
    });

    it('should allow if user has required role', () => {
      mockReq.user = {
        id: 'admin-123',
        subject: 'sub-123',
        email: 'admin@example.com',
        role: 'admin',
      };

      const middleware = authorize('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow if user has one of multiple allowed roles', () => {
      mockReq.user = {
        id: 'user-123',
        subject: 'sub-123',
        email: 'test@example.com',
        role: 'user',
      };

      const middleware = authorize('admin', 'user');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('optionalAuth', () => {
    it('should continue without error if no token provided', async () => {
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeUndefined();
    });

    it('should set user if valid token provided', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (userGrpcClient.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        user: mockUser,
        scopes: [],
        expires_at: Date.now() + 3600000,
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeDefined();
    });

    it('should continue without error if token is invalid', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      (userGrpcClient.validateToken as jest.Mock).mockResolvedValue({
        valid: false,
        user: null,
        scopes: [],
        expires_at: 0,
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeUndefined();
    });

    it('should continue without error if gRPC call fails', async () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      (userGrpcClient.validateToken as jest.Mock).mockRejectedValue(new Error('gRPC error'));

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user).toBeUndefined();
    });
  });
});
