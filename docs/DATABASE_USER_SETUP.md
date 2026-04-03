# Database User Setup - Quick Guide

## Create Dedicated Database User (Priority #5)

### Why?
- Currently using `root` user (has ALL database privileges)
- If app is compromised, attacker has full database access
- Dedicated user limits damage to only TechTrack database tables

## Setup Using MySQL Workbench

### Step 1: Open MySQL Workbench
- Launch MySQL Workbench
- Connect to your MySQL instance (should show localhost connection)

### Step 2: Create New SQL Query Tab
- Click **File** → **New Query Tab** (or File → New Query Window)
- Or click the **+** button next to the query tab
- You should see a blank SQL editor window

### Step 3: Copy-Paste SQL Commands

Paste all these commands together in the SQL editor:

```sql
-- Create new database user
CREATE USER 'techtrack_user'@'127.0.0.1' IDENTIFIED BY 'techtrack_secure_password';

-- Grant permissions (SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP on techtrack_db only)
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP ON techtrack_db.* TO 'techtrack_user'@'127.0.0.1';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify user was created
SELECT User, Host FROM mysql.user WHERE User = 'techtrack_user';
```

### Step 4: Execute Commands
- Click the **lightning bolt** ⚡ icon (Execute) or press **Ctrl+Enter**
- You should see:
  - "Query OK" messages for CREATE USER, GRANT, FLUSH
  - A result table showing `techtrack_user | 127.0.0.1`

### Step 5: Verify New User Works
In the same query editor, paste and execute:

```sql
-- Test connection with new credentials
-- (This just shows the query syntax - actual test is in Step 6)
SELECT DATABASE(), USER();
```

### Step 6: Test New Credentials in New Connection
1. Click **MySQL** menu → **New Connection**
2. Fill in:
   - **Connection Name:** `TechTrack Dev`
   - **Hostname:** `127.0.0.1`
   - **Username:** `techtrack_user`
   - **Password:** `techtrack_secure_password` (click "Store in Vault" if desired)
3. Click **Test Connection** → Should show "Successfully made the MySQL connection"
4. Click **OK** to save

### ✅ All Done!
The `.env` file is already updated with new credentials. Just restart Django:

```powershell
cd backend\djangomonitor
python manage.py runserver
```

---

## Reference

**Old Setup (Insecure):**
- User: `root`
- Password: `Ara071804`

**New Setup (Secure):**
- User: `techtrack_user`
- Password: `techtrack_secure_password`
- Permissions limited to: SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP on `techtrack_db` only

---

## Screenshots Help

If you get stuck in Workbench:
1. **Query Editor** is the large white text area where you paste SQL
2. **Execute** button is the lightning bolt ⚡ in the toolbar
3. **Result** shows below the query editor
4. If you see red errors, copy the error message and we can troubleshoot

