import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

async function setupTestUsers() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech'),
  });

  await dataSource.initialize();
  console.log('✅ Connected to database\n');

  try {
    // Passwords
    const password1 = 'TestPass2026!Solar';
    const password2 = 'TestPass2026!Crystal';
    const hashedPassword1 = await bcrypt.hash(password1, 10);
    const hashedPassword2 = await bcrypt.hash(password2, 10);

    // Check Tenant 1
    const tenant1 = await dataSource.query(
      `SELECT * FROM tenants WHERE schema_name = 'seesl_schema' LIMIT 1`
    );
    
    if (tenant1.length === 0) {
      console.log('❌ Tenant 1 (SOLUTION_ENERGY / seesl_schema) NOT FOUND');
      console.log('   Please create it via SuperAdmin API first\n');
    } else {
      console.log('✅ Tenant 1 found:', tenant1[0].name, '/', tenant1[0].schema_name);
      
      // Update/Create admin user for Tenant 1
      const user1 = await dataSource.query(
        `SELECT * FROM "user" WHERE email = 'saencrystal.global@gmail.com' LIMIT 1`
      );
      
      if (user1.length === 0) {
        console.log('   Creating admin user for Tenant 1...');
        await dataSource.query(`
          INSERT INTO "user" (id, email, password_hash, role, tenant_id, is_active, created_at, updated_at)
          VALUES (gen_random_uuid(), 'saencrystal.global@gmail.com', $1, 'Admin', $2, true, NOW(), NOW())
        `, [hashedPassword1, tenant1[0].tenant_id]);
        console.log('   ✅ Created user: saencrystal.global@gmail.com');
      } else {
        console.log('   Updating password for existing user...');
        await dataSource.query(`
          UPDATE "user" SET password_hash = $1, updated_at = NOW() WHERE email = 'saencrystal.global@gmail.com'
        `, [hashedPassword1]);
        console.log('   ✅ Updated password for: saencrystal.global@gmail.com');
      }
    }

    console.log('');

    // Check Tenant 2
    const tenant2 = await dataSource.query(
      `SELECT * FROM tenants WHERE schema_name = 'sgs_schema' LIMIT 1`
    );
    
    if (tenant2.length === 0) {
      console.log('❌ Tenant 2 (SAENCRYSTAL_GLOBAL_SERVICES / sgs_schema) NOT FOUND');
      console.log('   Creating it now...\n');
      
      await dataSource.query(`
        INSERT INTO tenants (tenant_id, name, schema_name, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), 'SAENCRYSTAL_GLOBAL_SERVICES', 'sgs_schema', true, NOW(), NOW())
        RETURNING *
      `);
      
      const newTenant2 = await dataSource.query(
        `SELECT * FROM tenants WHERE schema_name = 'sgs_schema' LIMIT 1`
      );
      
      console.log('✅ Created Tenant 2:', newTenant2[0].name, '/', newTenant2[0].schema_name);
      
      // Create schema
      await dataSource.query(`CREATE SCHEMA IF NOT EXISTS sgs_schema`);
      console.log('✅ Created schema: sgs_schema');
      
      // Create admin user
      await dataSource.query(`
        INSERT INTO "user" (id, email, password_hash, role, tenant_id, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), 'saencrystal@gmail.com', $1, 'Admin', $2, true, NOW(), NOW())
      `, [hashedPassword2, newTenant2[0].tenant_id]);
      console.log('✅ Created user: saencrystal@gmail.com');
    } else {
      console.log('✅ Tenant 2 found:', tenant2[0].name, '/', tenant2[0].schema_name);
      
      // Update/Create admin user for Tenant 2
      const user2 = await dataSource.query(
        `SELECT * FROM "user" WHERE email = 'saencrystal@gmail.com' LIMIT 1`
      );
      
      if (user2.length === 0) {
        console.log('   Creating admin user for Tenant 2...');
        await dataSource.query(`
          INSERT INTO "user" (id, email, password_hash, role, tenant_id, is_active, created_at, updated_at)
          VALUES (gen_random_uuid(), 'saencrystal@gmail.com', $1, 'Admin', $2, true, NOW(), NOW())
        `, [hashedPassword2, tenant2[0].tenant_id]);
        console.log('   ✅ Created user: saencrystal@gmail.com');
      } else {
        console.log('   Updating password for existing user...');
        await dataSource.query(`
          UPDATE "user" SET password_hash = $1, updated_at = NOW() WHERE email = 'saencrystal@gmail.com'
        `, [hashedPassword2]);
        console.log('   ✅ Updated password for: saencrystal@gmail.com');
      }
    }

    console.log('\n=== Test Credentials Ready ===');
    console.log('Tenant 1: saencrystal.global@gmail.com / TestPass2026!Solar');
    console.log('Tenant 2: saencrystal@gmail.com / TestPass2026!Crystal');
    console.log('===============================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

setupTestUsers();
