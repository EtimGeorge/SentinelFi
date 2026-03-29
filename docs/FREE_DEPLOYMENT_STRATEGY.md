# Detailed Step-by-Step Free Deployment Guide (MVP)

This guide provides a granular, standalone roadmap to deploying the entire SentinelFi stack (Frontend, Backend, AI Agent, DB, and Cache) using free-tier services. This is designed for your "Pitch Phase" and requires zero upfront cost.

---

## 🛠️ Phase 1: Provisioning the Core (Data & Cache)

### **Step 1: PostgreSQL Database (Neon)**
1.  Sign up at [Neon.tech](https://neon.tech).
2.  Create a new project named `sentinelfi-demo`.
3.  In the dashboard, find **Connection Details**.
4.  Ensure the mode is set to **Pooled** (this is better for serverless).
5.  **Copy the Connection String**: It should look like `postgresql://user:pass@ep-hostname.us-east-2.aws.neon.tech/neondb?sslmode=require`.
    *   *Save this as `DATABASE_URL`.*

### **Step 2: Redis Cache (Upstash)**
1.  Sign up at [Upstash.com](https://upstash.com).
2.  Create a new **Redis** database named `sentinelfi-cache`.
3.  Select the **Free Tier (Global)**.
4.  In the Dashboard, find the **Node.js** tab under "Details."
5.  **Copy the REDIS_URL**: It will look like `rediss://default:password@hostname.upstash.io:6379`.
    *   *Save this as `REDIS_URL`.*

---

## 🚀 Phase 2: Deploying the Backend API (Koyeb)

We will use [Koyeb](https://koyeb.com) for the NestJS backend and Python AI agent because of their excellent monorepo support.

### **Step 3: NestJS Backend Deployment**
1.  Sign up at [Koyeb.com](https://koyeb.com) and connect your GitHub repository.
2.  Click **Create Service**.
3.  Choose **GitHub** as the source and select your `SentinelFi` repository.
4.  **Configure Service**:
    *   **Service Name**: `sentinelfi-api`
    *   **Branch**: `main` (or your preferred branch).
    *   **Base Directory**: `/backend` (CRITICAL for monorepos).
    *   **Run Command**: `npm run start:prod` (or `node dist/main`).
5.  **Environment Variables**: Click "Add Variable" for each:
    - `DATABASE_URL`: (Your Neon string from Step 1)
    - `REDIS_URL`: (Your Upstash string from Step 2)
    - `JWT_SECRET_KEY`: Create a long random string (e.g., `super-secret-123-abc-!!!`).
    - `NODE_ENV`: `production`
    - `PORT`: `8080` (Koyeb default).
6.  **Deploy**: Click "Deploy." Copy the provided URL (e.g., `sentinelfi-api-user.koyeb.app`).
    *   *Save this as `BACKEND_URL`.*

### **Step 4: Python AI Agent Deployment**
1.  Click **Create Service** again in Koyeb.
2.  Select the same GitHub repository.
3.  **Configure Service**:
    *   **Service Name**: `sentinelfi-ai`
    *   **Base Directory**: `/ai-agent`
    *   **Run Command**: `uvicorn main:app --host 0.0.0.0 --port 8000`
4.  **Environment Variables**:
    - `GOOGLE_API_KEY`: Your Gemini API key.
    - `PORT`: `8000`
5.  **Deploy**: Copy the provided URL (e.g., `sentinelfi-ai-user.koyeb.app`).
    *   *Save this as `AI_AGENT_URL`.*

---

## 🌐 Phase 3: Deploying the Frontend (Vercel)

### **Step 5: Next.js Frontend Deployment**
1.  Sign up at [Vercel.com](https://vercel.com) and connect your GitHub repository.
2.  Click **Add New Project** and select `SentinelFi`.
3.  **Configure Project**:
    *   **Project Name**: `sentinelfi-web`
    *   **Framework Preset**: `Next.js`
    *   **Root Directory**: `frontend` (NOT /frontend, just click "edit" and select the folder).
4.  **Environment Variables**:
    - `NEXT_PUBLIC_API_URL`: (Your Koyeb Backend URL from Step 3).
    - `NEXT_PUBLIC_APP_URL`: Your Vercel domain (it will be `sentinelfi-web.vercel.app` by default).
5.  **Deploy**: Click "Deploy."

---

## 🏁 Phase 4: Final Verification & "Cold Start" Management

### **Step 6: Linking the Whole Circuit**
1.  Go back to your **Koyeb Backend Service Settings**.
2.  Add a new Environment Variable:
    - `FRONTEND_URL`: `https://sentinelfi-web.vercel.app` (Your Vercel URL).
    - `AI_AGENT_URL`: `https://sentinelfi-ai-user.koyeb.app` (Your Koyeb AI URL).
3.  Redeploy the backend.

### **Step 7: The "Pitch Minute" (Important!)**
Because these are **Free Tiers**, Koyeb and Neon will "sleep" after 1 hour of inactivity.
1.  **60 Seconds before your pitch**: Open your Vercel URL.
2.  Login immediately. This will trigger the "wake-up" call to the backend and database.
3.  Wait about 10-20 seconds for the first request to complete.
4.  Once the first page loads, the system will be fast and responsive for the rest of your session.

---
*Precision. Resilience. Intelligence. SentinelFi.*
