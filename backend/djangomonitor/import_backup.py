#!/usr/bin/env python
import os
import django
import pymysql

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from django.db import connection

# Read the SQL file
sql_file = r'c:\Users\Cyruz\Documents\GitHub\TechTrack\techtrack_db_backup.sql'

print(f"Reading backup file: {sql_file}")
try:
    with open(sql_file, 'r', encoding='utf-16') as f:
        sql_content = f.read()
except (UnicodeDecodeError, UnicodeError):
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()

print(f"File size: {len(sql_content)} bytes")

# Split by statements and execute
cursor = connection.cursor()
statements = sql_content.split(';')
count = 0

for statement in statements:
    statement = statement.strip()
    if statement and not statement.startswith('--'):
        try:
            cursor.execute(statement)
            count += 1
            if count % 50 == 0:
                print(f"✅ Executed {count} statements...")
        except Exception as e:
            if "already exists" in str(e) or "Duplicate" in str(e):
                # Skip table/key already exists errors
                pass
            else:
                print(f"⚠️  Error on statement: {statement[:100]}...")
                print(f"   Error: {str(e)}")

connection.commit()
cursor.close()

print(f"\n✅ Import complete! Executed {count} SQL statements")

# Verify data was imported
cursor = connection.cursor()
cursor.execute("SELECT COUNT(*) FROM app_productprocess")
products = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM app_requests")
requests = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM app_worker")
workers = cursor.fetchone()[0]

print(f"\n📊 Data imported:")
print(f"  • Products: {products}")
print(f"  • Requests: {requests}")
print(f"  • Workers: {workers}")
