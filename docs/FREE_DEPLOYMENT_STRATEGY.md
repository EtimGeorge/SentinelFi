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

> [!IMPORTANT]
> **Why we can't use Render or Koyeb without a card:**
> As of 2025/2026, most major cloud providers (Render, Koyeb, Fly.io, Oracle) require a credit card as a "Human Identity Gate." This is an anti-abuse measure to prevent botnets and crypto-miners from saturating their free resources. Even though they won't charge you, the card is mandatory for verification.

## 🚀 Phase 2: Deploying the Backend & AI Agent (Card-Free)

For a **permanent** zero-card experience (avoiding Railway's 30-day limit), we will split the backend services between **Back4App** (Node.js) and **Hugging Face** (Python).

### **Step 3: NestJS Backend Deployment (Back4App)**

> [!CAUTION]
> **The Critical Monorepo Setting (this caused your build failure):**
> This app is a monorepo. Back4App must build from the repository **root**, not `/backend`.

1.  Sign up at [Back4App.com](https://www.back4app.com) – **No credit card required.**
2.  Go to **Web Apps** -> **New App** -> **GitHub**.
3.  Select your `SentinelFi` repository.
4.  **Configure Service (⚠️ Critical Settings)**:
    *   **Root Directory**: `/` ← Leave this as root (NOT `/backend`)
    *   **Dockerfile Path**: `backend/Dockerfile` ← Point here explicitly
    *   **Health Check Path**: `/api/v1/health`
    *   **Port**: `3001`
    *   **Environment Variables** (add each one):
        - `DATABASE_URL`: (Your Neon string from Step 1)
        - `REDIS_URL`: (Your Upstash string from Step 2)
        - `JWT_SECRET_KEY`: (Any random 32+ character string)
        - `NODE_ENV`: `production`
        - `FRONTEND_URL`: (Your Vercel URL from Step 5, e.g. `https://sentinelfi-web.vercel.app`)
5.  **Click "Deploy"**. Copy the provided URL — save as `BACKEND_URL`.

**Why does this work?** The `backend/Dockerfile` uses `COPY shared ./shared` — this path only exists if the build context is the repo root. Setting root to `/backend` caused Back4App to give the builder a context where `shared/` doesn't exist, producing the `no source files specified` error.


### **Step 4: Python AI Agent Deployment (Hugging Face Spaces)**

> [!NOTE]
> Hugging Face Spaces does **not** have a "Connect GitHub" UI button. The correct method is to push your `ai-agent/` code directly as a Git repository to your HF Space, or use the GitHub Actions workflow we've already set up at `.github/workflows/sync-ai-agent-to-hf.yml`.

#### Part A: Create the Space (Do this once, manually)

1.  Sign up at [huggingface.co](https://huggingface.co) – **No credit card required.**
2.  Click your profile icon -> **"New Space"**.
3.  **Space Name**: `sentinelfi-ai`
4.  **License**: `MIT` / **SDK**: `Docker` / **Hardware**: `CPU Basic` (free).
5.  Click **"Create Space"**. *(It will show a basic template — don't configure files here.)*

#### Part B: Add the Secret (API Key)

1.  On your Space page, click **"Settings"** (top-right tab).
2.  Scroll to **"Variables and secrets"** -> click **"New secret"**.
3.  **Name**: `GOOGLE_API_KEY` / **Value**: your Gemini API key.
4.  Click **"Save"**. ✅ (This is injected at runtime as an env variable.)

#### Part C: Configure GitHub Actions for Auto-Sync

We've already created `.github/workflows/sync-ai-agent-to-hf.yml` in your repo. You need to activate it:

1.  Go to your **GitHub repository** -> **Settings** -> **Secrets and variables** -> **Actions**.
2.  Click **"New repository secret"**.
3.  **Name**: `HF_TOKEN` / **Value**: your HF access token (find it at `huggingface.co/settings/tokens` — create a **Write** token).
4.  **Edit the workflow file** and replace `HF_USERNAME` with your actual HF username:
    ```
    c:\temp\SentinelFi\.github\workflows\sync-ai-agent-to-hf.yml
    ```
5.  Commit and push to `main`. GitHub Actions will automatically push the `ai-agent/` directory to your HF Space. 🚀

#### Part D: First Manual Push (Before Actions Are Active)

If you want to deploy immediately without waiting for a GitHub push:
```bash
# Run from the SentinelFi root
cd ai-agent
git init
git remote add space https://YOUR_HF_USERNAME:YOUR_HF_TOKEN@huggingface.co/spaces/YOUR_HF_USERNAME/sentinelfi-ai
git add -A
git commit -m "Initial deployment"
git push space HEAD:main --force
```


---

## 🏥 Health Check Configuration

When setting up these services, you may be asked for a **Health Check Path**. This allows the platform to know if the app is "Up."

- **Backend (NestJS)**: `/api/v1/health`
- **AI Agent (Python)**: `/`
- **Frontend (Vercel)**: Automatic.




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
