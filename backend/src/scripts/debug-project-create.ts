
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProjectsService } from '../projects/projects.service';
import { CreateProjectDto } from '../projects/dto/create-project.dto';
import { ClsService } from 'nestjs-cls';
import { UserEntity } from '../auth/user.entity';
import * as fs from 'fs';
import * as path from 'path';

const logFile = path.resolve(__dirname, '../../debug-log.txt');
fs.writeFileSync(logFile, `Script started at ${new Date().toISOString()}\n`);

function log(message: any) {
  const msg = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
  fs.appendFileSync(logFile, msg + '\n');
  console.log(msg); // Keep console.log just in case
}

log('Starting debug script...');

async function bootstrap() {
  try {
    log('Creating application context...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });
    log('Application context created.');

    const projectsService = app.get(ProjectsService);
    const clsService = app.get(ClsService);

    log('Services retrieved.');

    // Simulate Tenant Context
    const tenantId = '66336363-6536-3333-3333-653133313262'; // Replace with a valid tenant UUID from your DB
    const userId = '11111111-1111-1111-1111-111111111111'; // Replace with a valid user UUID

    // Mock User
    const mockUser = new UserEntity();
    mockUser.id = userId;
    mockUser.tenant_id = tenantId;
    mockUser.email = 'debug@example.com';
    mockUser.first_name = 'Debug';
    mockUser.last_name = 'User';

    log('Running within CLS context...');
    await clsService.run(async () => {
      clsService.set('tenant_id', tenantId);
      clsService.set('USER', mockUser);
       // Hardcode schema for the known tenant
      clsService.set('SCHEMA_NAME', 'sgs_schema'); 
      log('CLS Context set: tenant_id=' + tenantId + ', SCHEMA_NAME=sgs_schema');

      const dto: CreateProjectDto = {
        project_name: `Debug Project ${Date.now()}`,
        contract_value: 100000,
        // client_id: undefined, // Test without client first
      };

      log('Calling projectsService.create()...');
      try {
        const project = await projectsService.create(dto, userId, tenantId);
        log('Project Created Successfully: ' + JSON.stringify(project));
      } catch (error) {
        log('Project Creation Failed: ' + JSON.stringify(error));
      }
    });

    log('Closing application...');
    await app.close();
    log('Application closed.');
  } catch (err) {
    log('Bootstrap failed: ' + JSON.stringify(err));
  }
}

bootstrap();
