import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function audit() {
    dotenv.config({ path: [path.resolve(process.cwd(), 'backend', '.env.local'), path.resolve(process.cwd(), 'backend', '.env')] });

    const ds = new DataSource({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('neon.tech'),
    });

    try {
        await ds.initialize();
        console.log('--- DATABASE AUDIT ---');
        
        const tenantCount = await ds.query('SELECT COUNT(*) FROM tenants');
        console.log('Total Tenants:', tenantCount[0].count);

        const auditCount = await ds.query('SELECT COUNT(*) FROM audit_log');
        console.log('Total Audit Logs:', auditCount[0].count);
        
        if (auditCount[0].count > 0) {
            const recentLogs = await ds.query('SELECT action, "userEmail", timestamp FROM audit_log ORDER BY timestamp DESC LIMIT 5');
            console.log('Recent Logs:', recentLogs);
        }

        const growthData = await ds.query(`
            SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count 
            FROM tenants 
            WHERE created_at > NOW() - INTERVAL '30 days'
            GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
            ORDER BY date ASC
        `);
        console.log('Tenant Growth Data (Raw):', growthData);

    } catch (e) {
        console.error('Audit failed:', e);
    } finally {
        await ds.destroy();
    }
}

audit();
