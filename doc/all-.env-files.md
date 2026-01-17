### C:\temp\SentinelFi\backend\.env.local

# This file is for local environment variables. It is loaded by ormconfig.ts and NestJS.
# It is ignored by Git and should contain your local database connection string.

# --- IMPORTANT ---
# Replace the placeholder below with your actual NeonDB connection string.
# The format should be: postgresql://<user>:<password>@<host>/<dbname>?sslmode=require

# Copy the template provided
# cp backend/.env.local.template backend/.env.local

 # LOCAL BACKEND ENVIRONMENT (For: npm run start:dev
 #---------------------------------------------------
 # Neon Database connection 
DATABASE_URL=postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require


 # CRITICAL:Security Secrets 
JWT_SECRET_KEY=da4c13192233962f1f2972cbef078ca08f40fc2a673f452b566ebf5326f64f88
JWT_EXPIRATION_TIME=3600s

NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

NODE_ENV=development, SEED_SUPERADMIN=true
SUPERADMIN_PASSWORD=YourSecureSuperAdminPassword

DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
RESEND_API_KEY="your_resend_api_key"
EMAIL_FROM="onboarding@resend.dev"


### C:\temp\SentinelFi\backend\.env

# Phase 3 Deliverable: Global Configuration File

# -----------------
# JWT CONFIGURATION (OAuth 2.0 / OIDC Token Security)
# The Secret Key used to sign the JWTs. MUST be a long, random string in production.
JWT_SECRET_KEY=da4c13192233962f1f2972cbef078ca08f40fc2a673f452b566ebf5326f64f88
JWT_EXPIRATION_TIME=3600s # 1 hour

# -----------------
# GLOBAL SYSTEM CONFIGURATION
# The default schema name for the master tenant (used during development before dynamic tenant creation)
GLOBAL_DEFAULT_SCHEMA=client_template

DATABASE_URL=postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

NODE_ENV=development 

# Seeder Configuration
# Set to "true" to enable the initial SuperAdmin seeder in development 
SEED_SUPERADMIN=true
SUPERADMIN_PASSWORD="##Ndiong1988##"

 # Frontend URL for CORS 
 FRONTEND_URL="http://localhost:3000"
 # Application Port
 PORT=3001 

 DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
RESEND_API_KEY="your_resend_api_key"
EMAIL_FROM="onboarding@resend.dev"



### C:\temp\SentinelFi\backend\.env.example

DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
RESEND_API_KEY="your_resend_api_key"
EMAIL_FROM="onboarding@resend.dev"



### C:\temp\SentinelFi\frontend\.env.local

# LOCAL FRONTEND ENVIRONMENT (For: npm run dev)
# ----------------------------------------------
# CRITICAL: Next.js PUBLIC variable must point to the local NestJS server port (3000)
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1



### C:\temp\SentinelFi\.env.prod

# CRITICAL: EXTERNAL NEON DATABASE CONNECTION
# Replace the placeholder with your actual Neon connection URL
DB_URL=postgresql://neondb_owner:npg_Zj7Im1SgebkV@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
# CRITICAL: JWT SECURITY SECRETS
# Replace with a long, random, secure string
JWT_SECRET_KEY=79afea6641c4e0c8703314d7de68a6078c3e8630908c7e1658de5920f859b100
JWT_EXPIRATION_TIME=3600s

# Throttler Configuration (optional - uses defaults if not set)
# Time to live for records in seconds (default: 60)
THROTTLE_TTL=60
# Max requests within the TTL (default: 10)
THROTTLE_LIMIT=10

