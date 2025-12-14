import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { config } from '../../config';
import logger from '../../utils/logger';

// Reference shared proto repository
// In Docker (dev/prod): proto is at /app/proto
// Locally: proto is at ../../../../proto relative to this file
const isDocker = process.cwd() === '/app';
const PROTO_PATH = isDocker
  ? '/app/proto/user.proto'
  : path.resolve(__dirname, '../../../../proto/user.proto');

// User role enum matching proto
export enum UserRole {
  UNSPECIFIED = 0,
  USER = 1,
  ADMIN = 2,
}

// User status enum matching proto
export enum UserStatus {
  UNSPECIFIED = 0,
  ACTIVE = 1,
  INACTIVE = 2,
  SUSPENDED = 3,
}

export interface User {
  id: string;
  subject: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string;
  role: UserRole;
  status: UserStatus;
  organization_id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string>;
}

export interface ValidateTokenResponse {
  valid: boolean;
  user: User | null;
  scopes: string[];
  expires_at: number;
}

interface GetUserResponse {
  user: User;
}

interface UserServiceClient {
  ValidateToken(
    request: { access_token: string },
    callback: (error: grpc.ServiceError | null, response: ValidateTokenResponse) => void,
  ): void;
  GetUser(
    request: { user_id: string },
    callback: (error: grpc.ServiceError | null, response: GetUserResponse) => void,
  ): void;
  GetUserBySubject(
    request: { subject: string },
    callback: (error: grpc.ServiceError | null, response: GetUserResponse) => void,
  ): void;
}

type ServiceClientConstructor = new (
  address: string,
  credentials: grpc.ChannelCredentials,
) => UserServiceClient;

interface UserProtoNamespace {
  UserService: ServiceClientConstructor;
}

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: Number,
  defaults: true,
  oneofs: true,
});

const userProto = grpc.loadPackageDefinition(packageDefinition)
  .user as unknown as UserProtoNamespace;

let cachedClient: UserServiceClient | null = null;

export const getUserClient = (
  serverAddress: string = config.grpc.userServiceUrl,
): UserServiceClient => {
  if (!cachedClient) {
    cachedClient = new userProto.UserService(serverAddress, grpc.credentials.createInsecure());
    logger.info(`User gRPC client connected to ${serverAddress}`);
  }
  return cachedClient;
};

/**
 * Validate access token via user-service gRPC
 * Returns user info if valid, null if invalid
 */
export const validateToken = (accessToken: string): Promise<ValidateTokenResponse> => {
  return new Promise((resolve, reject) => {
    const client = getUserClient();
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5); // 5 second timeout

    client.ValidateToken(
      { access_token: accessToken },
      (error: grpc.ServiceError | null, response: ValidateTokenResponse) => {
        if (error) {
          logger.error('User gRPC ValidateToken error:', error.message);
          reject(error);
        } else {
          resolve(response);
        }
      },
    );
  });
};

/**
 * Get user by ID via user-service gRPC
 */
export const getUser = (userId: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    const client = getUserClient();

    client.GetUser(
      { user_id: userId },
      (error: grpc.ServiceError | null, response: GetUserResponse) => {
        if (error) {
          logger.error('User gRPC GetUser error:', error.message);
          reject(error);
        } else {
          resolve(response.user);
        }
      },
    );
  });
};

/**
 * Get user by Asgardeo subject ID via user-service gRPC
 */
export const getUserBySubject = (subject: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    const client = getUserClient();

    client.GetUserBySubject(
      { subject },
      (error: grpc.ServiceError | null, response: GetUserResponse) => {
        if (error) {
          logger.error('User gRPC GetUserBySubject error:', error.message);
          reject(error);
        } else {
          resolve(response.user);
        }
      },
    );
  });
};

/**
 * Helper to convert role enum to string
 */
export const roleToString = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN:
      return 'admin';
    case UserRole.USER:
      return 'user';
    default:
      return 'user';
  }
};

/**
 * Helper to check if role has permission
 */
export const hasRole = (userRole: UserRole, allowedRoles: string[]): boolean => {
  const roleStr = roleToString(userRole);
  return allowedRoles.includes(roleStr);
};
