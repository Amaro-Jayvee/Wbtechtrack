#!/usr/bin/env python
"""
Analyze INSERT statement structure in backup
"""
import re

backup_file = r'c:\Users\Cyruz\Documents\GitHub\TechTrack\techtrack_db_backup.sql'

with open(backup_file, 'r', encoding='utf-16') as f:
    sql_content = f.read()

# Extract all INSERT statements
insert_pattern = r'INSERT INTO `(\w+)` \((.*?)\) VALUES'
matches = re.findall(insert_pattern, sql_content)

print("[BACKUP SCHEMA ANALYSIS]\n")

tables_info = {}
for table, columns in matches:
    columns_list = [c.strip().strip('`') for c in columns.split(',')]
    if table not in tables_info:
        tables_info[table] = columns_list
        print(f"Table: {table}")
        print(f"  Columns ({len(columns_list)}): {', '.join(columns_list)}")
        print()

# Now check what Django expects
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from django.db import connection

print("\n[CURRENT DATABASE SCHEMA]\n")
cursor = connection.cursor()

for table in tables_info.keys():
    try:
        cursor.execute(f"DESCRIBE {table}")
        columns = cursor.fetchall()
        current_cols = [col[0] for col in columns]
        backup_cols = tables_info[table]
        
        print(f"Table: {table}")
        print(f"  Backup columns ({len(backup_cols)}): {', '.join(backup_cols)}")
        print(f"  Current columns ({len(current_cols)}): {', '.join(current_cols)}")
        
        # Find differences
        missing_in_current = set(backup_cols) - set(current_cols)
        extra_in_current = set(current_cols) - set(backup_cols)
        
        if missing_in_current:
            print(f"  Missing in current: {', '.join(missing_in_current)}")
        if extra_in_current:
            print(f"  Extra in current: {', '.join(list(extra_in_current)[:5])}{'...' if len(extra_in_current) > 5 else ''}")
        print()
    except Exception as e:
        print(f"Table: {table} - Error: {e}\n")
