
console.log('Script loaded. Importing modules...');
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProjectsService } from '../projects/projects.service';
import { CreateProjectDto } from '../projects/dto/create-project.dto';
import { ClsService } from 'nestjs-cls';
import { UserEntity } from '../auth/user.entity';

async function bootstrap() {
  try {
    console.log('Initializing Application Context...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });
    console.log('Application Context Initialized.');

    const projectsService = app.get(ProjectsService);
    const clsService = app.get(ClsService);

    console.log('Services retrieved. Setting up mock context...');

    // Simulate Tenant Context
    const tenantId = '66336363-6536-3333-3333-653133313262'; 
    const userId = '11111111-1111-1111-1111-111111111111';

    const mockUser = new UserEntity();
    mockUser.id = userId;
    mockUser.tenant_id = tenantId;

    await clsService.run(async () => {
      clsService.set('tenant_id', tenantId);
      clsService.set('USER', mockUser);
      // Hardcode schema for the known tenant
      clsService.set('SCHEMA_NAME', 'sgs_schema'); 
      console.log('Context set. Running tests...');

      console.log('--- TEST 1: Create Project with New Client (Inline) ---');
      const newClientName = `Inline Client ${Date.now()}`;
      const dto1: CreateProjectDto = {
        project_name: `Project with Inline Client ${Date.now()}`,
        contract_value: 50000,
        client_name: newClientName,
        // client_id is undefined
      };

      try {
        const project1 = await projectsService.create(dto1, userId, tenantId);
        console.log(`[SUCCESS] Project created with new client: ${newClientName}`);
        console.log(`Associated Client ID: ${project1.client_id}`);
        
        if (!project1.client_id) {
          console.error('[FAILURE] Client ID was not set on project!');
        }
      } catch (error) {
        console.error('[FAILURE] Test 1 Failed:', error);
      }

      console.log('\n--- TEST 2: Create Project with Existing Client Name (Smart Association) ---');
      const dto2: CreateProjectDto = {
        project_name: `Project with Existing Client ${Date.now()}`,
        contract_value: 75000,
        client_name: newClientName, // Reuse same name
      };

      try {
        const project2 = await projectsService.create(dto2, userId, tenantId);
        console.log(`[SUCCESS] Project created associated with EXISTING client: ${newClientName}`);
        console.log(`Associated Client ID: ${project2.client_id}`);
      } catch (error) {
         console.error('[FAILURE] Test 2 Failed:', error);
      }

    });

    await app.close();
    console.log('Application closed.');
  } catch (error) {
    console.error('CRITICAL ERROR in bootstrap:', error);
    process.exit(1);
  }
}

console.log('Starting bootstrap...');
bootstrap();
