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
  migrations: ['src/migrations/**/*.ts'],
  migrationsRun: true, // Automatically run migrations on startup
  subscribers: [],
  poolSize: config.db.poolMax,
  extra: {
    min: config.db.poolMin,
    max: config.db.poolMax,
  },
});

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    logger.info('✅ Database connection established successfully');
  } catch (error) {
    logger.error('❌ Error during database initialization:', error);
    throw error;
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
