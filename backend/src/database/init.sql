-- SQL DDL FOR SentinelFi INITIAL SCHEMA SETUP
-- This script provides the foundational schema for public tables,
-- aligning with current TypeORM entity definitions.

-- 1. CREATE NECESSARY EXTENSIONS (in public schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
