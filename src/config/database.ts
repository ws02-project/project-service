import 'reflect-metadata';
import { DataSource } from 'typeorm';
import config from './index';
import { Project } from '../models/project.model';
import logger from '../utils/logger';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.user,
  password: config.db.password,
  database: config.db.name,
  synchronize: config.env === 'development', // Auto-sync schema in development only
  logging: config.env === 'development',
  entities: [Project],
  migrations: [config.env === 'production' ? 'dist/migrations/**/*.js' : 'src/migrations/**/*.ts'],
  migrationsRun: true, // Automatically run migrations on startup
  subscribers: [],
  poolSize: config.db.poolMax,
  extra: {
    min: config.db.poolMin,
    max: config.db.poolMax,
    // Connection timeout for Istio ambient mesh compatibility
    connectionTimeoutMillis: 30000, // 30 seconds
    idleTimeoutMillis: 30000, // 30 seconds
    statement_timeout: 30000,
    // PostgreSQL connection options
    connect_timeout: 30, // 30 seconds connection timeout
  },
});

// Initialize database connection with retry logic for Istio ambient mesh
export const initializeDatabase = async (retryAttempts: number = 5): Promise<void> => {
  let attempt = 0;

  while (attempt < retryAttempts) {
    try {
      attempt++;
      logger.info(`🔄 Connecting to database... (attempt ${attempt}/${retryAttempts})`);

      await AppDataSource.initialize();
      logger.info('✅ Database connection established successfully');
      return;
    } catch (error: any) {
      if (attempt >= retryAttempts) {
        logger.error('❌ Error during database initialization:', error);
        throw error;
      }

      // Check if it's a connection reset error (common with Istio)
      if (
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT'
      ) {
        const waitTime = Math.min(1000 * attempt, 5000); // Exponential backoff, max 5s
        logger.warn(
          `Failed to connect to database (attempt ${attempt}/${retryAttempts}). Retrying in ${waitTime}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        // For other errors, throw immediately
        logger.error('❌ Error during database initialization:', error);
        throw error;
      }
    }
  }
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('✅ Database connection closed successfully');
    }
  } catch (error) {
    logger.error('❌ Error during database closure:', error);
    throw error;
  }
};
