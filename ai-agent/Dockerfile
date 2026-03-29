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
ENV PORT=8000

EXPOSE 8000

CMD ["python", "main.py"]
