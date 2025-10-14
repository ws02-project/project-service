import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchemaV1 implements MigrationInterface {
  name = 'InitialSchema1697000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "status" character varying(50) NOT NULL DEFAULT 'active',
        "owner" character varying(100),
        "members" text,
        "tags" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_status" CHECK (status IN ('active', 'archived', 'on_hold', 'completed'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_projects_status" ON "projects" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_projects_owner" ON "projects" ("owner")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_projects_created_at" ON "projects" ("created_at" DESC)
    `);

    // Insert sample data
    await queryRunner.query(`
      INSERT INTO "projects" ("name", "description", "status", "owner", "members", "tags") VALUES
        ('Microservices Architecture', 'Building a complete microservices-based system', 'active', 'admin', 'admin,developer1,developer2', 'backend,microservices,nodejs'),
        ('Mobile App Development', 'Cross-platform mobile application', 'active', 'admin', 'admin,mobile-dev1', 'mobile,react-native,frontend'),
        ('Legacy System Migration', 'Migrating old monolith to new architecture', 'on_hold', 'admin', 'admin,backend-dev', 'migration,refactoring'),
        ('Documentation Portal', 'Internal documentation and knowledge base', 'completed', 'admin', 'admin,tech-writer', 'documentation,wiki')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_owner"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
  }
}
