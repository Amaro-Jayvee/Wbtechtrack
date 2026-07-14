FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev gcc pkg-config && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps from the backend folder's requirements.txt
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy backend application code into the image
COPY . .

RUN mkdir -p /app/logs /app/staticfiles

EXPOSE 8000

# Run migrations and start the server via the provided script
CMD ["python", "/app/run_server_docker.py"]
