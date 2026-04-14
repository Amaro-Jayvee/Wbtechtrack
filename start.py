#!/usr/bin/env python
"""
Railway startup script - runs migrations then starts gunicorn
Works on free tier (no shell needed, pure Python execution)
"""
import os
import sys
import django
from django.core.management import call_command
from gunicorn.app.wsgiapp import run as gunicorn_run

# Change to backend directory
os.chdir('backend/djangomonitor')
sys.path.insert(0, os.getcwd())

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')

print("[STARTUP] Initializing Django...")
django.setup()

print("[STARTUP] Running Django migrations...")
try:
    call_command('migrate', '--noinput', verbosity=2)
    print("[STARTUP] ✅ Migrations completed successfully")
except Exception as e:
    print(f"[STARTUP] ⚠️  Migration error (continuing): {e}")

print("[STARTUP] Starting gunicorn server...")

# Prepare gunicorn arguments
port = os.environ.get('PORT', '8080')
workers = os.environ.get('WEB_CONCURRENCY', '3')

sys.argv = [
    'gunicorn',
    'djangomonitor.wsgi:application',
    '--bind', f'0.0.0.0:{port}',
    '--workers', str(workers),
    '--timeout', '120',
    '--access-logfile', '-',
    '--error-logfile', '-',
]

# Start gunicorn
gunicorn_run()
