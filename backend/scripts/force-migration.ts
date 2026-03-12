import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import * as fs from 'fs';

async function bootstrap() {
  try {
    fs.appendFileSync('migration.log', 'Starting Nest Application Context...\n');
    const app = await NestFactory.createApplicationContext(AppModule);
    fs.appendFileSync('migration.log', 'AppModule Booted. Getting DataSource...\n');
    const dataSource = app.get(DataSource);
    
    fs.appendFileSync('migration.log', 'DataSource retrieved. Running migrations...\n');
    const migrations = await dataSource.runMigrations();
    fs.appendFileSync('migration.log', `Migrations executed successfully: ${migrations.map(m => m.name).join(', ')}\n`);
    
    await app.close();
  } catch (error) {
    fs.appendFileSync('migration.log', `MIGRATION FAILED: ${error instanceof Error ? error.stack : String(error)}\n`);
  }
}

bootstrap().catch(err => {
  fs.appendFileSync('migration.log', `UNHANDLED REJECTION: ${err instanceof Error ? err.stack : String(err)}\n`);
});
