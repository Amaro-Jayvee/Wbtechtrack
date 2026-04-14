"""
WSGI config for djangomonitor project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os
import sys

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')

# Run migrations on application startup
def run_migrations():
    from django.core.management import call_command
    try:
        print("[WSGI] Running migrations on startup...")
        call_command('migrate', '--noinput', verbosity=1)
        print("[WSGI] ✅ Migrations completed")
    except Exception as e:
        print(f"[WSGI] ⚠️ Migration error: {e}", file=sys.stderr)

# Call migrations before creating WSGI application
run_migrations()

application = get_wsgi_application()
