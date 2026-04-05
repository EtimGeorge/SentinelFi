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
1.  Go directly to the console at [console.upstash.com](https://console.upstash.com) (the main homepage is sometimes blocked by local ISPs).
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

> [!TIP]
> **Monorepo Build Context:**
> We have provided a `Dockerfile` at the root of the repository. Back4App and Render will automatically detect this file and use the repository root `/` as the build context.

1.  Sign up at [Back4App.com](https://www.back4app.com) – **No credit card required.**
2.  Go to **Web Apps** -> **New App** -> **GitHub**.
3.  Select your `SentinelFi` repository.
4.  **Configure Service**:
    *   **Root Directory**: Leave empty or set to `/` (default).
    *   **Dockerfile Path**: Leave blank or set to `Dockerfile` (it is auto-detected at the root).
    *   **Health Check Path**: `/api/v1/health`
    *   **Port**: `3001`
    *   **Environment Variables** (add each one):
        - `DATABASE_URL`: (Your Neon string from Step 1)
        - `REDIS_URL`: (Your Upstash string from Step 2)
        - `JWT_SECRET_KEY`: (Any random 32+ character string)
        - `NODE_ENV`: `production`
        - `FRONTEND_URL`: (Your Vercel URL from Step 5, e.g. `https://sentinelfi-web.vercel.app`)
5.  **Click "Deploy"**. Copy the provided URL — save as `BACKEND_URL`.

**Why does this work so easily?** We placed the `Dockerfile` at the root directory of the codebase. Cloud platforms automatically detect root Dockerfiles, and starting the build from the root ensures monorepo folders like `shared/` are accessible during the build.



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

#### Part C: Create Your Hugging Face Write Token & Add to GitHub

**Step C-1: Create the HF Write Token (do this on HuggingFace.co)**

1.  Open your browser and go to: **[https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)**
    *(You must be logged in to your HF account.)*
2.  Click the **"New token"** button (top-right of the page).
3.  Fill in the form:
    - **Name**: `sentinelfi-github-actions` *(any descriptive name)*
    - **Role**: Select **"Write"** ← *This is critical.* Read-only tokens cannot push to Spaces.
4.  Click **"Generate a token"**.
5.  A token string starting with `hf_` will appear — for example: `hf_aBcDeFgHiJkLmNoPqRsTuVwXyZ`
6.  **⚠️ Copy it immediately.** HF only shows it once. If you lose it, delete it and generate a new one.

**Step C-2: Add the Token to Your GitHub Repository Secrets**

1.  Go to your **GitHub repository** page (e.g. `github.com/EtimGeorge/SentinelFi`).
2.  Click **"Settings"** tab (top of the repo page, not your profile settings).
3.  In the left sidebar, click **"Secrets and variables"** → **"Actions"**.
4.  Click the green **"New repository secret"** button.
5.  Fill in:
    - **Name**: `HF_TOKEN` *(must be exactly this — the workflow file uses this name)*
    - **Secret**: Paste the `hf_...` token you copied in Step C-1.
6.  Click **"Add secret"**. ✅

**Step C-3: Update the Workflow File with Your HF Username**

1.  Open this file in your editor:
    ```
    c:\temp\SentinelFi\.github\workflows\sync-ai-agent-to-hf.yml
    ```
2.  Find the two lines that say `HF_USERNAME` and replace both with your actual HF username.
    - Your HF username is shown at the top-left of any HF page when logged in, or at `huggingface.co/settings/account`.
    - Example: if your username is `john_doe`, the line becomes:
    ```yaml
    run: git push https://john_doe:$HF_TOKEN@huggingface.co/spaces/john_doe/sentinelfi-ai main
    ```
3.  Save the file, commit it, and push to `main`:
    ```powershell
    git add .github/workflows/sync-ai-agent-to-hf.yml
    git commit -m "chore: configure HF username in sync workflow"
    git push
    ```
4.  Go to your GitHub repo → **"Actions"** tab — you should see the workflow run and push to HF. 🚀

#### Part D: First Manual Push (Before Actions Are Active)

If you want to deploy immediately without waiting for a GitHub push:
```bash
# Run from the SentinelFi root
cd ai-agent
git init
git remote add space https://YOUR_HF_USERNAME:YOUR_HF_TOKEN@huggingface.co/spaces/Saencrystal/sentinelfi_ai
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
    - `NEXT_PUBLIC_API_URL`: (Your Back4App Backend URL from Step 3).
    - `NEXT_PUBLIC_APP_URL`: Your Vercel domain (it will be `sentinelfi-web.vercel.app` by default).
5.  **Deploy**: Click "Deploy."

---

## 🏁 Phase 4: Final Verification & "Cold Start" Management

### **Step 6: Linking the Whole Circuit**
1.  Go back to your **Back4App Environment Variables** settings.
2.  Add a new Environment Variable:
    - `FRONTEND_URL`: `https://sentinelfi-web.vercel.app` (Your Vercel URL).
    - `AI_AGENT_URL`: `https://USERNAME-sentinelfi-ai.hf.space` (Your Hugging Face Space URL. Replace USERNAME with your HF username).
3.  Save and redeploy the backend.

### **Step 7: The "Pitch Minute" (Important!)**
Because these are **Free Tiers**, Back4App and Neon will "sleep" after 1 hour of inactivity.
1.  **60 Seconds before your pitch**: Open your Vercel URL.
2.  Login immediately. This will trigger the "wake-up" call to the backend and database.
3.  Wait about 10-20 seconds for the first request to complete.
4.  Once the first page loads, the system will be fast and responsive for the rest of your session.

---
*Precision. Resilience. Intelligence. SentinelFi.*
