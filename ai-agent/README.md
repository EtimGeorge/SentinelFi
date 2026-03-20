# SentinelFi: Financial Intelligence AI Agent

The SentinelFi AI Agent is a high-performance Python application built with FastAPI and LangChain. It acts as the "brain" of the platform, transforming raw financial data into executive-grade insights.

## 🏗️ Architecture: Autonomous Financial Intelligence

The AI Agent is designed for secure and accurate financial reasoning:

*   **`main.py`**: FastAPI entry point. Manages high-concurrency requests from the NestJS backend.
*   **`workflows/`**: LangChain orchestration logic. Features custom chains for Dashboard Analysis, Forecasting, and Report Generation.
*   **`tools/`**: Specialized financial tools for variance analysis, trend detection, and multi-currency normalization.
*   **`guardrails/`**: Multi-layer security logic. Filters PII and ensures prompts remain within the financial domain.

## ⚡ Core Capabilities

1.  **Dashboard Analysis:** Sub-second narrative generation for CAPEX/OPEX/WBS states.
2.  **Autonomous Forecasting:** Uses burn-rate history and project timelines to predict budget variances.
3.  **Governance Reporting:** Generates professional financial narratives branded for the enterprise tenant.
4.  **Guardrail Hardening:** Both input and output filtering to prevent hallucinations and data leaks.

## 🚀 Development & Setup

Ensure you have **Python 3.11+** installed.

1.  **Environment Setup:**
    Create a `.env` with `GOOGLE_API_KEY` (Gemini Pro).
2.  **Initialize Venv:**
    ```bash
    python -m venv venv
    ./venv/Scripts/activate  # Windows
    pip install -r requirements.txt
    ```
3.  **Launch:**
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8000
    ```

---
*The intelligence behind the world's most critical financial structures.*
