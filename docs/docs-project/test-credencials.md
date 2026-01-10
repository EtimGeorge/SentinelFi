# Multi-Tenancy Test Credentials

## Tenant 1: SOLUTION_ENERGY
- **Tenant Name:** SOLUTION_ENERGY
- **Schema Name:** seesl_schema
- **Admin Email:** saencrystal.global@gmail.com
- **Admin Password:** TestPass2026!Solar

---

## Tenant 2: SAENCRYSTAL_GLOBAL_SERVICES
- **Tenant Name:** SAENCRYSTAL_GLOBAL_SERVICES
- **Schema Name:** sgs_schema
- **Admin Email:** saencrystal@gmail.com
- **Admin Password:** TestPass2026!Crystal

---

## Setup Instructions

### Step 1: Run the Setup Script
```bash
npx ts-node backend/scripts/setup-test-tenants.ts
```

This script will:
- Verify Tenant 1 exists and set/update the admin password
- Create Tenant 2 (if not exists) with schema and admin user
- Set passwords for both admin users

### Step 2: Verify Tenants in Database
```sql
SELECT tenant_id, name, schema_name, is_active FROM tenants;
SELECT id, email, role, tenant_id, is_active FROM users WHERE email IN ('saencrystal.global@gmail.com', 'saencrystal@gmail.com');
```

---

## Testing Multi-Tenant Isolation

### Test 1: Login as Tenant 1 Admin
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "saencrystal.global@gmail.com",
  "password": "TestPass2026!Solar"
}
```

### Test 2: Login as Tenant 2 Admin
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "saencrystal@gmail.com",
  "password": "TestPass2026!Crystal"
}
```

### Test 3: Create WBS Data (Tenant 1)
Use the JWT from Test 1 to create WBS budget data. Verify it's stored in `seesl_schema`.

### Test 4: Create WBS Data (Tenant 2)
Use the JWT from Test 2 to create WBS budget data. Verify it's stored in `sgs_schema`.

### Test 5: Verify Data Isolation
- Ensure Tenant 1 cannot access Tenant 2's data
- Check backend logs for `search_path` changes per request

---

**Security Note:** These are test passwords only. Use secure, unique passwords in production.
