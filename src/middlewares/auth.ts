import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import createApiError from '../utils/ApiError';
import logger from '../utils/logger';
import {
  validateToken,
  User,
  UserRole,
  UserStatus,
  roleToString,
} from '../grpc/clients/user.grpc.client';

/**
 * Authenticate middleware - validates JWT token via user-service gRPC
 * Extracts user info from token validation response
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed - No token', {
        type: 'auth_failure',
        reason: 'no_token',
        ip: req.ip || req.socket.remoteAddress,
        requestId: req.requestId,
        path: req.path,
      });
      throw createApiError(httpStatus.UNAUTHORIZED, 'No access token provided');
    }

    const token = authHeader.substring(7);

    // Validate token via user-service gRPC
    const result = await validateToken(token);

    if (!result.valid || !result.user) {
      logger.warn('Authentication failed - Invalid token', {
        type: 'auth_failure',
        reason: 'invalid_token',
        ip: req.ip || req.socket.remoteAddress,
        requestId: req.requestId,
        path: req.path,
      });
      throw createApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token');
    }

    // Check if user is active
    if (result.user.status !== UserStatus.ACTIVE) {
      logger.warn('Authentication failed - User not active', {
        type: 'auth_failure',
        reason: 'user_inactive',
        userId: result.user.id,
        status: result.user.status,
        requestId: req.requestId,
      });
      throw createApiError(httpStatus.FORBIDDEN, 'User account is not active');
    }

    // Store user in request
    req.user = {
      id: result.user.id,
      subject: result.user.subject,
      email: result.user.email,
      role: roleToString(result.user.role),
    };

    logger.info('Authentication successful', {
      type: 'auth_success',
      userId: result.user.id,
      email: result.user.email,
      role: roleToString(result.user.role),
      requestId: req.requestId,
      duration: Date.now() - startTime,
    });

    next();
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const err = error as Error & { statusCode?: number; code?: number };

    if (err.statusCode) {
      next(error);
    } else if (err.code === 14) {
      // gRPC UNAVAILABLE - user-service is down
      logger.error('Authentication failed - User service unavailable', {
        type: 'auth_failure',
        reason: 'service_unavailable',
        requestId: req.requestId,
        duration,
      });
      next(createApiError(httpStatus.SERVICE_UNAVAILABLE, 'Authentication service unavailable'));
    } else {
      logger.error('Authentication failed - Unexpected error', {
        type: 'auth_failure',
        reason: 'unexpected_error',
        error: err.message,
        requestId: req.requestId,
        duration,
      });
      next(createApiError(httpStatus.UNAUTHORIZED, 'Authentication failed'));
    }
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for public endpoints that have enhanced functionality for authenticated users
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const result = await validateToken(token);

    if (result.valid && result.user && result.user.status === UserStatus.ACTIVE) {
      req.user = {
        id: result.user.id,
        subject: result.user.subject,
        email: result.user.email,
        role: roleToString(result.user.role),
      };
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    logger.warn('Optional auth failed:', error);
    next();
  }
};

/**
 * Authorize middleware - checks if user has required role
 * Must be used after authenticate middleware
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.warn('Authorization failed - Not authenticated', {
        type: 'authz_failure',
        reason: 'not_authenticated',
        requestId: req.requestId,
        path: req.path,
      });
      return next(createApiError(httpStatus.UNAUTHORIZED, 'Not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed - Insufficient permissions', {
        type: 'authz_failure',
        reason: 'insufficient_permissions',
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        requestId: req.requestId,
        path: req.path,
      });
      return next(createApiError(httpStatus.FORBIDDEN, 'Insufficient permissions'));
    }

    logger.debug('Authorization successful', {
      type: 'authz_success',
      userId: req.user.id,
      userRole: req.user.role,
      requestId: req.requestId,
    });

    next();
  };
};

/**
 * Check if user owns the resource or is admin/manager
 * Useful for update/delete operations where users can only modify their own resources
 */
export const authorizeOwnerOrRole = (
  getOwnerId: (req: Request) => string | undefined,
  ...allowedRoles: string[]
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createApiError(httpStatus.UNAUTHORIZED, 'Not authenticated'));
    }

    const ownerId = getOwnerId(req);

    // Allow if user is the owner
    if (ownerId && ownerId === req.user.id) {
      return next();
    }

    // Allow if user has one of the allowed roles
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    logger.warn('Authorization failed - Not owner and insufficient role', {
      type: 'authz_failure',
      reason: 'not_owner_or_role',
      userId: req.user.id,
      userRole: req.user.role,
      ownerId,
      requiredRoles: allowedRoles,
      requestId: req.requestId,
    });

    return next(
      createApiError(httpStatus.FORBIDDEN, 'You do not have permission to access this resource'),
    );
  };
};

// Re-export types for convenience
export { User, UserRole, UserStatus };
