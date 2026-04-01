FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for unstructured and PDF processing
# Install base build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libmagic-dev \
    && rm -rf /var/lib/apt/lists/*

# Install document processing utilities (Heavy layers)
# Splitting these helps Docker for Windows handle large extraction tasks
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1
# Hugging Face Spaces requires port 7860
ENV PORT=7860

# HF Spaces runs as UID 1000 (non-root) — required
RUN useradd -m -u 1000 user
USER user

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
