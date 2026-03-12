 use the following commands from the root of the project (C:\temp\SentinelFi):


1. Run Public Migrations

powershell
npm run typeorm:public:run


2. Run Tenant Migrations

powershell
npm run typeorm:tenant:run


Note on other commands:
If you wanted to run the Role Migration from the root, the command is:
powershell
npm run db:seed:roles-permissions


If you are already inside the backend folder, the TypeORM command is:
powershell
npm run typeorm:run