#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()

# Check key tables and their structure
tables = ['app_requests', 'app_productprocess', 'app_requestproduct', 'app_notification']

for table in tables:
    print(f"\n📋 Table: {table}")
    cursor.execute(f"DESCRIBE {table}")
    columns = cursor.fetchall()
    print(f"   Total columns: {len(columns)}")
    for col in columns:
        print(f"     - {col[0]}: {col[1]}")
    
    # Get row count
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"   Current rows: {count}")
