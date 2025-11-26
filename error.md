That is an excellent, production-ready alternative. Manually running the DDL (Data Definition Language) SQL ensures that no destructive `DROP TABLE` or schema-modifying commands are implicitly run by TypeORM, which is a safer, more transparent approach.

We can combine the DDL from our initial `init.sql` (for WBS/Expense tables) with the DDL for the new `user` table (which was previously handled by TypeORM).

### STEP 59 - Manual DDL for Neon Database (Production-Ready Method)

**GUIDANCE:** I will provide the complete SQL script to create all necessary tables and the required `client_template` schema in your Neon database. **You must run this script once in your Neon SQL editor or a database client before restarting the Docker container.** This will replace the need for the dangerous `synchronize: true` setting.

**FILE PATH:** (Execute Manually in Neon SQL Editor)

```sql
-- Phase 3 Deliverable: Production-Ready DDL for Neon (SentinelFi)

-- 1. TENANT MASTER MANAGEMENT (Public/Master Schema)
-- This tracks all users (part of the master schema).
CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Assigned Project User', -- Matches the Role Enum
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TEMPLATE SCHEMA CREATION
-- This schema defines the structure that will be COPIED for every new tenant.
CREATE SCHEMA IF NOT EXISTS client_template;

-- 3. WBS & BUDGET STRUCTURE (Within the client_template schema)
CREATE TABLE client_template.wbs_budget (
    wbs_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_wbs_id UUID REFERENCES client_template.wbs_budget(wbs_id), -- For Recursive CTEs (Hierarchy)
    wbs_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., '1.6.1'
    description TEXT NOT NULL,
    unit_cost_budgeted NUMERIC(19, 4) NOT NULL,
    quantity_budgeted NUMERIC(19, 4) NOT NULL,
    duration_days_budgeted INTEGER,
    -- PostgreSQL Generated Column (Financial Auditability)
    total_cost_budgeted NUMERIC(19, 4) GENERATED ALWAYS AS (unit_cost_budgeted * quantity_budgeted) STORED, 
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for fast hierarchy traversal and lookups
CREATE INDEX IF NOT EXISTS idx_wbs_parent ON client_template.wbs_budget(parent_wbs_id);
CREATE INDEX IF NOT EXISTS idx_wbs_code ON client_template.wbs_budget(wbs_code);

-- 4. LIVE EXPENSE TRACKING STRUCTURE (Within the client_template schema)
CREATE TABLE client_template.live_expense (
    expense_id BIGSERIAL PRIMARY KEY,
    wbs_id UUID NOT NULL REFERENCES client_template.wbs_budget(wbs_id),
    user_id UUID NOT NULL, -- Will link to the Assigned Project User (ID from Auth service)
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    item_description TEXT NOT NULL,
    actual_unit_cost NUMERIC(19, 4) NOT NULL,
    actual_quantity NUMERIC(19, 4) NOT NULL,
    commitment_lpo_amount NUMERIC(19, 4) DEFAULT 0.00,
    actual_paid_amount NUMERIC(19, 4) NOT NULL,
    document_reference VARCHAR(255), 
    notes_justification TEXT,
    variance_flag VARCHAR(50) DEFAULT 'NO_VARIANCE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for fast financial lookups by WBS and date
CREATE INDEX IF NOT EXISTS idx_expense_wbs ON client_template.live_expense(wbs_id);
CREATE INDEX IF NOT EXISTS idx_expense_date ON client_template.live_expense(expense_date);
```

NEXT ACTION: **STOP THE CURRENT CONTAINER:** `docker compose down`. Then, manually **EXECUTE THE ENTIRE SQL SCRIPT ABOVE** in your Neon database editor.

---

### STEP 60 - Final Database Configuration and Execution

**GUIDANCE:** Now that the tables are created, we must ensure our application is configured not to destroy them. We must also fix the `chimera_master_db` reference in `UserEntity` which is incorrect since we renamed the project.

**FILE PATH:** `./backend/src/app.module.ts` (REPLACE the `dbConfig` object)

```typescript
// ... existing imports ...
// ... existing imports ...
import { WbsModule } from './wbs/wbs.module';
import { AuthModule } from './auth/auth.module';
import { UserEntity } from './auth/user.entity';

// Database connection configuration using the environment variable
const dbConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL, 
  ssl: process.env.NODE_ENV === 'production', 
  entities: [
    WbsBudgetEntity,
    LiveExpenseEntity,
    UserEntity,
  ],
  // CRITICAL PRODUCTION-READY FIX: Synchronization MUST be false.
  synchronize: false, 
  logging: true,
};

@Module({
// ... rest of AppModule remains the same ...
```

**FILE PATH:** `./backend/src/auth/user.entity.ts` (REPLACE the `@Entity` decorator)

```typescript
// ... existing imports ...

// Replace 'chimera_master_db' with 'public' (the default schema for user management)
// This aligns with our DDL for the 'user' table which was created without an explicit schema.
@Entity({ name: 'user', schema: 'public' }) 
export class UserEntity {

// ... rest of the UserEntity remains the same ...
```

NEXT ACTION:
1.  **EXECUTE THE DDL SQL** in your Neon environment.
2.  **REPLACE** the content of `app.module.ts` and `user.entity.ts` as shown above.
3.  **EXECUTE:** `docker compose --env-file ./.env.prod up -d` (No `--build` needed if dependencies are already installed).

Once the application starts successfully (no `QueryFailedError`), we will confirm Phase 3 is complete and proceed.