# SentinelFi: Executive Unified Frontend

The SentinelFi Frontend is a high-performance Next.js (React) application designed for real-time financial oversight and executive-grade decision support.

## 🏗️ Architecture & Philosophy: Executive Unified Dashboard

The frontend is built for clarity and sub-second visibility across 10,000+ concurrent mission-critical users:

*   **[`/app`](./app)**: Next.js App Router structure. High-performance Server Components for initial data loads.
*   **[`/components`](./components)**: Atomic UI library. Features custom financial charts, executive summary cards, and the AI chat widget.
*   **[`/context`](./context)**: Unified state management for Authentication (NextAuth), Multi-Tenancy (TenantContext), and AI Sessions (ChatContext).
*   **[`/hooks`](./hooks)**: Reusable financial logic for real-time variance calculations and multi-currency formatting.

## ⚡ Key Features

1.  **AI-Integrated Insights:** Direct integration with the Python AI Agent for real-time natural language analysis of dashboard data.
2.  **Enterprise Auth Suite:** Role-Based Access Control (RBAC) enforced at the UI layer. Secure JWT session management.
3.  **Governance Dashboard:** Unified view of CAPEX, OPEX, and WBS structures with sub-second drill-down capabilities.
4.  **Responsive Hardening:** Optimized for ultra-responsive performance on high-resolution executive monitors and mobile devices.

## 🚀 Development Quick Start

Ensure you have **Node.js v20+** installed.

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Environment Setup:**
    Configure `NEXT_PUBLIC_API_URL` to point to the NestJS backend.
3.  **Launch:**
    ```bash
    npm run dev
    ```

---
*Visualizing the world's most critical financial structures.*
