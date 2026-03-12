import AppDataSource from '../ormconfig';

async function run() {
  try {
    await AppDataSource.initialize();
    const migrations = await AppDataSource.runMigrations();
    console.log("Applied migrations:", migrations.map(m => m.name));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await AppDataSource.destroy();
  }
}

run();
