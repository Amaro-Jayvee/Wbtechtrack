# Dockerfile at root level
# Simple, direct startup - no confusion, no shell operators

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev gcc pkg-config && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY backend/djangomonitor/ .
COPY backend/run_server_docker.py .

RUN mkdir -p /app/logs /app/staticfiles

EXPOSE 8000

# ABSOLUTE SIMPLEST: Just run the Python script directly
CMD ["python", "/app/run_server_docker.py"]
