#!/usr/bin/env python
"""
Server startup script for Railway - handles directory change, migrations, and gunicorn
No shell commands needed - pure Python
"""
import os
import sys
import subprocess

# Get port from environment or use default
port = os.environ.get('PORT', '8080')

# Change to backend directory
backend_path = os.path.join(os.path.dirname(__file__), 'backend', 'djangomonitor')
os.chdir(backend_path)

print(f"[run_server.py] Changed directory to: {os.getcwd()}")
print(f"[run_server.py] PORT: {port}")

# Run migrations
print("[run_server.py] Running migrations...")
try:
    result = subprocess.run([
        sys.executable, 'manage.py', 'migrate', '--noinput'
    ], check=True, capture_output=True, text=True)
    print("[run_server.py] ✅ Migrations completed")
    print(result.stdout)
except subprocess.CalledProcessError as e:
    print(f"[run_server.py] ⚠️ Migration error (non-fatal): {e}")
    print(f"STDERR: {e.stderr}")
    # Don't exit - let gunicorn start anyway

# Start gunicorn using os.execvp to replace this process
print(f"[run_server.py] Starting gunicorn on 0.0.0.0:{port}...")
os.execvp('gunicorn', [
    'gunicorn',
    '-b', f'0.0.0.0:{port}',
    'djangomonitor.wsgi:application',
    '--workers', '3',
    '--timeout', '120',
    '--access-logfile', '-',
    '--error-logfile', '-'
])
