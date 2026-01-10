[8:04:31 AM] Starting compilation in watch mode...

src/superadmin/superadmin.service.ts:7:10 - error TS2305: Module '"shared/types/user"' has no exported member 'CreateUserDto'.

7 import { CreateUserDto } from 'shared/types/user'; // DTO for creating user
           ~~~~~~~~~~~~~

src/wbs/wbs.service.ts:23:32 - error TS2307: Cannot find module '@projects/dto/get-projects.dto' or its corresponding type declarations.

23 import { GetProjectsDto } from '@projects/dto/get-projects.dto';
                                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/wbs/wbs.service.ts:24:31 - error TS2307: Cannot find module '@projects/project.entity' or its corresponding type declarations.   

24 import { ProjectEntity } from '@projects/project.entity';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~

src/wbs/wbs.service.ts:25:33 - error TS2307: Cannot find module '@projects/projects.service' or its corresponding type declarations. 

25 import { ProjectsService } from '@projects/projects.service';
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/wbs/wbs.service.ts:138:5 - error TS2740: Type '(DeepPartial<WbsBudgetEntity> & WbsBudgetEntity)[]' is missing the following properties from type 'WbsBudgetEntity': wbs_id, project_id, project, parent_wbs_id, and 16 more.

138     return this.wbsBudgetRepository.save(updatedWbsBudget);
        ~~~~~~

[8:04:51 AM] Found 5 errors. Watching for file changes.
