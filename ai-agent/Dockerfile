FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for unstructured and PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic-dev \
    poppler-utils \
    tesseract-ocr \
    libreoffice \
    pandoc \
    gcc \
    python3-dev \
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
