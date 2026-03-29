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




1. Backend (NestJS)
powershell
cd backend
npm run start:dev
The backend will now boot with strict environment validation and provide real-time health telemetry.

2. AI Agent (Python)
powershell
cd ai-agent
.\venv\Scripts\activate
uvicorn main:app --reload
The AI Agent will start on port 8000, ready to handle requests from the backend with the new audit logging and guardrails active.

3. Frontend (Next.js)
powershell
cd frontend
npm run dev
Access the executive dashboard at http://localhost:3000.

Pro-Tip (Resilience Check): Once the servers are running, you can visit http://localhost:3001/api/v1/health (the backend health endpoint) to see the live status of the AI Circuit Breaker, Redis Caching, and Database connections all in one view.