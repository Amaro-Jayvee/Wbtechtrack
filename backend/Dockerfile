# Stage 1: Build and setup
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

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy project files
COPY djangomonitor/ .

# Create necessary directories
RUN mkdir -p /app/logs /app/staticfiles

# Expose port
EXPOSE 8000

# Copy startup script
COPY run_server_docker.py .

# Set explicit entrypoint to bypass any Railway default shell wrappers
ENTRYPOINT ["/usr/local/bin/python"]
CMD ["run_server_docker.py"]
