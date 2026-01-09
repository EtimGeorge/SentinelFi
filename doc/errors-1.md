[4:34:41 PM] Starting compilation in watch mode...

src/auth/auth.service.ts:16:58 - error TS2307: Cannot find module '@shared/types/user' or its corresponding type declarations.

16 import { CreateUserDto, UpdateUserDto, JwtPayload } from "@shared/types/user";
                                                            ~~~~~~~~~~~~~~~~~~~~

src/auth/auth.service.ts:17:22 - error TS2307: Cannot find module '@shared/types/role.enum' or its corresponding type declarations.  

17 import { Role } from "@shared/types/role.enum";
                        ~~~~~~~~~~~~~~~~~~~~~~~~~

src/auth/user.entity.ts:2:22 - error TS2307: Cannot find module '@shared/types/role.enum' or its corresponding type declarations.    

2 import { Role } from "@shared/types/role.enum";
                       ~~~~~~~~~~~~~~~~~~~~~~~~~

src/superadmin/dto/create-tenant-admin-user.dto.ts:2:31 - error TS2307: Cannot find module '@shared/types/user' or its corresponding 
type declarations.

2 import { CreateUserDto } from '@shared/types/user';
                                ~~~~~~~~~~~~~~~~~~~~

src/superadmin/dto/create-tenant-admin-user.dto.ts:4:22 - error TS2307: Cannot find module '@shared/types/role.enum' or its corresponding type declarations.

4 import { Role } from '@shared/types/role.enum'; // Ensure Role is imported
                       ~~~~~~~~~~~~~~~~~~~~~~~~~

src/superadmin/dto/create-tenant-admin-user.dto.ts:7:3 - error TS2322: Type 'string' is not assignable to type 'never'.

7   'email',
    ~~~~~~~

src/superadmin/dto/create-tenant-admin-user.dto.ts:8:3 - error TS2322: Type 'string' is not assignable to type 'never'.

8   'first_name',
    ~~~~~~~~~~~~

src/superadmin/dto/create-tenant-admin-user.dto.ts:9:3 - error TS2322: Type 'string' is not assignable to type 'never'.

9   'last_name',
    ~~~~~~~~~~~

src/superadmin/dto/create-tenant-admin-user.dto.ts:10:3 - error TS2322: Type 'string' is not assignable to type 'never'.

10   'role',
     ~~~~~~

src/superadmin/dto/create-tenant-admin-user.dto.ts:11:3 - error TS2322: Type 'string' is not assignable to type 'never'.

11   'is_active',
     ~~~~~~~~~~~

src/superadmin/dto/create-tenant-admin-user.dto.ts:12:3 - error TS2322: Type 'string' is not assignable to type 'never'.

12   'tenant_id',
     ~~~~~~~~~~~

[4:36:47 PM] Found 11 errors. Watching for file changes.
