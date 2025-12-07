import 'reflect-metadata';
import { AppDataSource, initializeDatabase } from '../config/database';
import logger from '../utils/logger';

async function runMigrations() {
  try {
    logger.info('🔄 Running database migrations...');

    // Use the initializeDatabase function which has retry logic for Istio
    await initializeDatabase(5);

    logger.info('✅ Database connection established');
    logger.info('🔄 Running migrations...');

    const migrations = await AppDataSource.runMigrations();

    if (migrations.length > 0) {
      logger.info(`✅ ${migrations.length} migration(s) executed successfully:`);
      migrations.forEach((migration) => {
        logger.info(`  - ${migration.name}`);
      });
    } else {
      logger.info('✅ No migrations to run');
    }

    await AppDataSource.destroy();
    logger.info('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
