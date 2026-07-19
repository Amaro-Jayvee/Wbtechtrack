import sqlite3

def print_table_info(db_path, table):
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.execute(f"PRAGMA table_info('{table}')")
        rows = cur.fetchall()
        print(f"TABLE {table} columns:")
        for r in rows:
            print(r)
    except Exception as e:
        print('ERROR:', e)

if __name__ == '__main__':
    db='db.sqlite3'
    print_table_info(db, 'app_productprocess')
    print_table_info(db, 'app_requestproduct')
