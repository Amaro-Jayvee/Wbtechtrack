#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from django.db import connection
cursor = connection.cursor()
cursor.execute("SHOW TABLES")
tables = cursor.fetchall()
print(f"✅ Total tables: {len(tables)}")

# Check for key tables
key_tables = ['app_requests', 'app_productprocess', 'app_worker', 'app_processprogress']
for table_name in key_tables:
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"  ✅ {table_name}: {count} records")
    except Exception as e:
        print(f"  ❌ {table_name}: ERROR - {str(e)}")
