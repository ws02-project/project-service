import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  environment: process.env.ENVIRONMENT || process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  serviceName: process.env.SERVICE_NAME || 'project-service',
  logLevel: process.env.LOG_LEVEL || 'info',
  grpc: {
    port: parseInt(process.env.GRPC_PORT || '50051', 10),
    taskServiceUrl: process.env.TASK_SERVICE_GRPC_URL || 'localhost:50052',
    userServiceUrl: process.env.USER_SERVICE_GRPC_URL || 'localhost:50053',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'projectdb',
    user: process.env.DB_USER || 'projectuser',
    password: process.env.DB_PASSWORD || 'projectpass',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

export const isProduction = config.env === 'production';
export const isDevelopment = config.env === 'development';

export default config;
