#!/usr/bin/env python
"""
Smart backup import that handles schema differences
"""
import os
import django
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangomonitor.settings')
django.setup()

from django.db import connection

backup_file = r'c:\Users\Cyruz\Documents\GitHub\TechTrack\techtrack_db_backup.sql'

print(f"[IMPORT] Reading backup: {backup_file}")

try:
    # Read the backup file
    with open(backup_file, 'r', encoding='utf-16') as f:
        sql_content = f.read()
    
    print(f"[INFO] File size: {len(sql_content)} bytes")
    
    # Split statements and filter for INSERT statements
    statements = sql_content.split(';')
    
    # Filter out comments, SET commands, and CREATE/DROP/ALTER
    insert_statements = []
    create_statements = []
    
    for stmt in statements:
        stmt = stmt.strip()
        if not stmt:
            continue
        
        # Skip comments and SET statements
        if stmt.startswith('--') or stmt.startswith('/*') or 'SET' in stmt.upper()[:10]:
            continue
        
        # Collect statements
        if stmt.upper().startswith('INSERT'):
            insert_statements.append(stmt)
        elif stmt.upper().startswith('CREATE TABLE'):
            create_statements.append(stmt)
    
    print(f"[INFO] Found {len(insert_statements)} INSERT statements")
    print(f"[INFO] Found {len(create_statements)} CREATE TABLE statements")
    
    cursor = connection.cursor()
    
    # Try to execute INSERTs with error handling for schema mismatches
    print("\n[EXECUTE] Processing INSERT statements...")
    executed = 0
    skipped = 0
    errors = 0
    
    for i, stmt in enumerate(insert_statements):
        if (i + 1) % 50 == 0:
            print(f"  Progress: {i + 1}/{len(insert_statements)} statements...")
        
        try:
            cursor.execute(stmt)
            executed += 1
        except Exception as e:
            error_str = str(e)
            # Skip known errors (duplicate entries, column count mismatch, etc.)
            if any(x in error_str for x in ['Column count', 'Duplicate entry', 'Duplicate key', 'foreign key']):
                skipped += 1
            else:
                errors += 1
                if errors <= 5:  # Show first 5 real errors
                    print(f"  [ERROR] {error_str[:100]}")
    
    print(f"\n[RESULTS]")
    print(f"  - Executed: {executed}")
    print(f"  - Skipped (schema): {skipped}")
    print(f"  - Other errors: {errors}")
    
    # Verify import
    print(f"\n[VERIFY] Checking data...")
    
    tables_to_check = [
        'app_product',
        'app_productprocess',
        'app_requests',
        'app_worker',
        'app_requestproduct',
        'app_processprogress'
    ]
    
    for table in tables_to_check:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  - {table}: {count} rows")
        except:
            pass

except Exception as e:
    print(f"[ERROR] {e}")
