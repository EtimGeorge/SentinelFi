# 🏢 16: SuperAdmin Controls

The **SuperAdmin Dashboard** is the platform-level command center for SentinelFi. It allows for the management of all tenant organizations, global system health, and billing subscriptions.

---

## 🏛️ Tenant Management

### 1. The Global Overview
- **Path**: Navigate to **"SuperAdmin -> Dashboard"**.
- **The Interface**: A high-level view of all active and inactive tenants.

### 2. Managing Organizations
- **Action**: Click on **"Manage Tenants"**.
- **Capabilities**:
  - **Create Tenant**: When a new company joins SentinelFi, the SuperAdmin creates their specific schema and initial admin account.
  - **Deactivate Tenant**: In cases of missed payments or compliance issues, the SuperAdmin can freeze a tenant's data access.
  - **Scale Tenant**: Adjust the maximum number of users or projects allowed for a specific organization.

---

## 📊 Platform Analytics (Aggregated)

### 1. Global AI Insights
- **What it is**: An aggregated view of financial trends across all organizations on the platform.
- **Why it matters**: It helps the platform owners identify broader market or economic shifts.

### 2. Infrastructure Health
- **Monitor**: Real-time tracking of the Redis cache, AI Agent connectivity, and database load.

---

## 🧾 Billing & Subscriptions

- **Path**: Navigate to **"SuperAdmin -> Billing"**.
- **The Process**: 
  1. **View Usage**: See exactly how many API calls each tenant has made to the AI engine.
  2. **Generate Invoice**: SentinelFi can automatically generate platform-level invoices for tenant subscription fees.
  3. **Plan Management**: Create and modify subscription tiers (e.g., *"Basic"*, *"Premium"*, *"Enterprise"*).

---

## 🛡️ Security & Platform Audits
- **Action**: Use the **"Platform Audit Log"** to track every action taken by other admins across the entire ecosystem.
- **Safety**: This ensures that even the SuperAdmin is held accountable by the platform owner.

---
*Next: [17: AI Communication & Messaging](file:///c:/temp/SentinelFi/docs/user-guides/17-AI-COMMUNICATION.md)*
