const { DataSource } = require('typeorm');
require('dotenv').config({path: 'D:/DOCUMENTS/Development/SentinelFi/backend/.env'});
require('ts-node').register({ transpileOnly: true });
// Need to load entities - use compiled JS if available? Use src entities via ts-node
const { ProjectEntity } = require('D:/DOCUMENTS/Development/SentinelFi/backend/src/projects/project.entity.ts');
