const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

async function seedSubscriptions() {
    console.log('--- STARTING JS SEEDING ---');
    
    // Try multiple paths for .env
    const envPaths = [
        path.join(process.cwd(), '.env.local'),
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), 'backend', '.env.local'),
        path.join(process.cwd(), 'backend', '.env')
    ];

    for (const p of envPaths) {
        dotenv.config({ path: p });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL not found in environment. Checked paths:', envPaths);
        return;
    }
    console.log('DATABASE_URL found. Length:', dbUrl.length);

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Database connected.');

        const tenantsRes = await client.query(`
            SELECT t.tenant_id, t.name, t.plan, u.email as admin_email
            FROM tenants t
            LEFT JOIN "user" u ON u.tenant_id = t.tenant_id
        `);
        const tenants = tenantsRes.rows;
        console.log(`Found ${tenants.length} tenant/user records.`);

        const now = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(now.getDate() + 14);

        for (const tenant of tenants) {
            const existingRes = await client.query('SELECT id FROM subscriptions WHERE tenant_id = $1', [tenant.tenant_id]);
            if (existingRes.rows.length === 0) {
                console.log(`Seeding trial subscription for tenant: ${tenant.name} (${tenant.tenant_id})`);
                await client.query(`
                    INSERT INTO subscriptions (
                        tenant_id, plan, status, billing_cycle,
                        amount_usd, gateway, admin_email, company_name,
                        trial_ends_at, current_period_start, current_period_end,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `, [
                    tenant.tenant_id,
                    tenant.plan || 'pro',
                    'trialing',
                    'monthly',
                    0,
                    'manual',
                    tenant.admin_email || 'admin@' + tenant.name.toLowerCase().replace(/\s/g, '') + '.com',
                    tenant.name,
                    trialEnd,
                    now,
                    trialEnd,
                    now,
                    now
                ]);
                console.log(`- Success: ${tenant.name}`);
            } else {
                console.log(`Tenant ${tenant.name} already has a subscription.`);
            }
        }

        console.log('--- SEEDING FINISHED SUCCESSFULLY ---');
    } catch (error) {
        console.error('Error during seeding:', error);
    } finally {
        await client.end();
    }
}

seedSubscriptions().catch(console.error);
