# SentinelFi: Reporting Engine & Industry WBS Templates

This document outlines the architecture and functionality of the newly implemented Reporting Engine and the Industry-Specific WBS Template system.

## 1. Tenant Branding & PDF Customization
SentinelFi now supports per-tenant branding for all generated documents.

### Branding Configuration
Administrators can configure branding in the **Settings > Branding** section:
- **Logo**: A Base64-encoded image displayed on all formal documents (POs, Invoices, Reports).
- **Primary Color**: A HEX color code used for accents and headers in PDFs.
- **Company Address**: The formal address of the tenant organization.

### PDF Generation Engine
The system uses **Puppeteer** on the backend to render pixel-perfect PDFs from Handlebars templates. 
- **Purchase Orders**: Formal procurement documents with itemized costs and terms.
- **Invoices**: Tax-compliant billing records.
- **WBS Budget Reports**: Comprehensive project budget hierarchies showing rollups, actuals, and variances.

**Endpoints:**
- `GET /api/finance-core/purchase-orders/:id/pdf`
- `GET /api/finance-core/invoices/:id/pdf`
- `GET /api/wbs/projects/:id/report-pdf`

---

## 2. Industry-Specific WBS Templates
To accelerate project onboarding, SentinelFi provides 10 pre-defined WBS hierarchies covering various industries.

### Supported Industries
1.  **IT & Software Development**: Sprint-based agile structure.
2.  **Construction**: Civil engineering and site preparation hierarchy.
3.  **Oil & Gas (Upstream)**: Exploration and drilling phases.
4.  **Oil & Gas (Downstream)**: Refining and distribution logic.
5.  **Real Estate Development**: Acquisition, permitting, and construction.
6.  **Manufacturing**: R&D, production lines, and logistics.
7.  **Telecommunications**: Fiber rollout and tower deployment.
8.  **Renewable Energy**: Solar and Wind farm installation.
9.  **Healthcare Infrastructure**: Hospital construction and equipment procurement.
10. **General Business**: A balanced OPEX/CAPEX structure for general projects.

### How it Works
- Templates are stored as JSON files in `backend/src/wbs/data/templates/`.
- During project creation in the **Project Setup Wizard**, users can select an industry template.
- The system automatically seeds the project's WBS with the selected hierarchy.
- Blank projects remain an option for custom setups.

---

## 3. Project Setup Wizard
The unified project creation flow now follows a 4-step process:
1.  **Identity**: Project name and client selection.
2.  **Financials**: Base currency, contract value, and tax rates (VAT/WHT).
3.  **WBS Initialization**: Template selection (Industry-specific or Blank).
4.  **Strategy**: Statement of Work (SOW) details.

---

## 4. Technical Architecture
- **Templates**: Handlebars (`.hbs`) for PDF structure, JSON for WBS defaults.
- **Rendering**: Chromium (via Puppeteer) for consistent rendering across platforms.
- **Persistence**: TypeORM migrations added `brand_logo`, `brand_color`, and `company_address` to the `Tenant` entity.
