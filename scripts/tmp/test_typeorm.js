require('ts-node').register({transpileOnly:true});
require('tsconfig-paths').register();
const { DataSource } = require('typeorm');
const { config } = require('dotenv');
config({path:'backend/.env'});
const { ProjectEntity } = require('backend/src/projects/project.entity');
const { WbsBudgetEntity } = require('backend/src/wbs/wbs-budget.entity');
const { WbsCategoryEntity } = require('backend/src/wbs/wbs-category.entity');
const { LiveExpenseEntity } = require('backend/src/wbs/live-expense.entity');
const { ClientEntity } = require('backend/src/clients/client.entity');
const { ProjectInflowEntity } = require('backend/src/projects/project-inflow.entity');
const { LpoEntity } = require('backend/src/projects/lpo.entity');
let url=process.env.DATABASE_URL;
if(url.startsWith('postgresql://')) url=url.replace('postgresql://','postgres://');
async function testSchema(schema, tenantId){
  console.log('\n--- Testing TypeORM for schema',schema,'---');
  const ds=new DataSource({
    type:'postgres',
    url,
    ssl:{rejectUnauthorized:false},
    schema,
    entities:[ProjectEntity,WbsBudgetEntity,WbsCategoryEntity,LiveExpenseEntity,ClientEntity,ProjectInflowEntity,LpoEntity],
    synchronize:false,
    logging:false,
  });
  await ds.initialize();
  try{
    const wbsRepo=ds.getRepository(WbsBudgetEntity);
    const qb=wbsRepo.createQueryBuilder('wbs')
      .leftJoinAndSelect('wbs.project','project')
      .leftJoinAndSelect('wbs.category','category')
      .where('wbs.tenant_id = :tenant_id',{tenant_id:tenantId})
      .orderBy('wbs.sort_order','ASC')
      .skip(0).take(1);
    const [data,total]=await qb.getManyAndCount();
    console.log('WbsService.findAllWbsBudgets OK total',total,'data len',data.length);
    if(data.length) console.log('sample wbs_id',data[0].wbs_id,'project_code',data[0].project?.project_code);
    // second test with wbs_code sort fallback
    const qb2=wbsRepo.createQueryBuilder('wbs')
      .leftJoinAndSelect('wbs.project','project')
      .leftJoinAndSelect('wbs.category','category')
      .where('wbs.tenant_id = :tenant_id',{tenant_id:tenantId})
      .orderBy('wbs.wbs_code','ASC')
      .skip(0).take(1);
    const [d2,t2]=await qb2.getManyAndCount();
    console.log('Second sort wbs_code OK total',t2);
    // projects
    const projRepo=ds.getRepository(ProjectEntity);
    const pq=projRepo.createQueryBuilder('project')
      .leftJoinAndSelect('project.client','client')
      .where('project.tenant_id = :tenantId',{tenantId})
      .orderBy('project.project_name','ASC')
      .skip(0).take(5);
    const [projects,ptotal]=await pq.getManyAndCount();
    console.log('ProjectsService.findAll OK total',ptotal,'projects len',projects.length);
    projects.forEach(p=>console.log(' project',p.project_name,'code',p.project_code));
  }catch(e){
    console.error('TypeORM FAILED',e.message);
    console.error(e.stack);
  } finally{
    await ds.destroy();
  }
}
(async()=>{
  const { Client } = require('pg');
  const url2=process.env.DATABASE_URL;
  const c=new Client({connectionString:url2, ssl:{rejectUnauthorized:false}});
  await c.connect();
  const tenants=await c.query('SELECT tenant_id,schema_name FROM public.tenants');
  await c.end();
  for(const t of tenants.rows){
    await testSchema(t.schema_name,t.tenant_id);
  }
})();
