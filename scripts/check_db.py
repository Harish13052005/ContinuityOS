import sys
sys.path.insert(0, r'C:/Users/Hp/Documents/GitHub/ContinuityOS/backend')
import sqlite3

db_path = r'C:\Users\Hp\Documents\GitHub\ContinuityOS\backend\.runtime.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print('Tables in database:', tables)

# Check data in each table
for table in tables:
    cursor.execute(f'SELECT count(*) FROM {table}')
    count = cursor.fetchone()[0]
    print(f'  {table}: {count} rows')

# Check projects specifically
cursor.execute('SELECT * FROM projects')
projects = cursor.fetchall()
print(f'\\nProjects: {len(projects)}')
for p in projects:
    print(f'  {p}')

conn.close()