#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Import backup by executing mysqldump SQL directly via mysql CLI
"""
import subprocess
import os
import sys

# Set UTF-8 encoding for output
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

backup_file = r'c:\Users\Cyruz\Documents\GitHub\TechTrack\techtrack_db_backup.sql'

print(f"[IMPORT] Reading backup: {backup_file}")

try:
    # Read the backup file
    with open(backup_file, 'r', encoding='utf-16') as f:
        sql_content = f.read()
    
    # Execute via mysql CLI using subprocess
    mysql_cmd = [
        r'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
        '-u', 'root',
        '-pAra071804',
        'techtrack_db'
    ]
    
    # Use Popen to write SQL content to stdin
    process = subprocess.Popen(
        mysql_cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    stdout, stderr = process.communicate(input=sql_content, timeout=60)
    
    if process.returncode == 0:
        print("[SUCCESS] Import successful!")
    else:
        print(f"[WARNING] MySQL returned code {process.returncode}")
        if stderr:
            print(f"Errors:\n{stderr[:500]}")
        if stdout:
            print(f"Output:\n{stdout[:500]}")
    
    # Verify import
    print("\n[VERIFY] Checking imported data...")
    import django
    import os as os2
    os2.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
    django.setup()
    
    from django.db import connection
    cursor = connection.cursor()
    
    tables_to_check = [
        'app_productprocess',
        'app_requests',
        'app_worker',
        'app_requestproduct'
    ]
    
    for table in tables_to_check:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  - {table}: {count} rows")
        except:
            print(f"  - {table}: Table not found or error")

except Exception as e:
    print(f"[ERROR] Import failed: {e}")
