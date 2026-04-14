# Dockerfile at root level - Railway will detect this immediately
# This prevents Railway from using Railpack for Python auto-detection

FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev \
    gcc \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements from backend subdirectory
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy Django project files from backend subdirectory
COPY backend/djangomonitor/ .

# Copy startup script from backend subdirectory
COPY backend/run_server_docker.py .

# Create necessary directories
RUN mkdir -p /app/logs /app/staticfiles

# Expose port
EXPOSE 8000

# Start server - use Python directly with full path to script
CMD ["python", "/app/run_server_docker.py"]
