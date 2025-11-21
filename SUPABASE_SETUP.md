# Supabase Setup Instructions

## ✅ Current Status
- Supabase URL: `https://qrujzlrqnngythxnpmdg.supabase.co`
- Anon Key: ✅ Added to `.env`
- Service Role Key: ⚠️ **NEEDED**

## Step 1: Get Service Role Key

The service role key is required for server-side database operations.

### How to find it:
1. Go to your Supabase Dashboard: https://app.supabase.com/project/qrujzlrqnngythxnpmdg
2. Click on **Settings** (gear icon) in the left sidebar
3. Click on **API** under Project Settings
4. Scroll down to **Project API keys**
5. Find the **service_role** key (it's a secret key - keep it safe!)
6. Copy the `service_role` key

### Add it to your .env file:
```bash
# Replace this line in your .env file:
SUPABASE_SERVICE_KEY=your-supabase-service-role-key

# With your actual service role key:
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...your-actual-key
```

## Step 2: Set Up Database Schema

You have 2 options:

### Option A: Using Supabase Dashboard (Recommended - Easy)

1. **Open SQL Editor**:
   - Go to https://app.supabase.com/project/qrujzlrqnngythxnpmdg/sql
   - Or click **SQL Editor** in the left sidebar

2. **Create New Query**:
   - Click **New Query** button

3. **Copy Database Schema**:
   - Open the file: `database/schema.sql` in your project
   - Copy ALL the contents (entire file)

4. **Paste and Run**:
   - Paste into the SQL Editor
   - Click **Run** (or press Ctrl/Cmd + Enter)
   - Wait for execution to complete

5. **Verify Tables Created**:
   - Click **Table Editor** in the left sidebar
   - You should see these tables:
     - ✅ users
     - ✅ conversation_sessions
     - ✅ work_experiences
     - ✅ education
     - ✅ skills
     - ✅ certifications
     - ✅ generated_documents
     - ✅ message_logs
     - ✅ cv_templates

### Option B: Using Command Line (Advanced)

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref qrujzlrqnngythxnpmdg

# Run migrations
supabase db push
```

## Step 3: Verify Connection

Once you have:
- ✅ Service role key added to `.env`
- ✅ Database schema created

Test the connection:

```bash
# Start the application
npm run start:dev

# You should see:
# Application is running on: http://localhost:3000
# (No database connection errors)
```

## Step 4: Test Database Operations

### Quick Test
```bash
curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "waId": "1234567890",
    "text": "start",
    "id": "test-msg-1",
    "type": "text"
  }'
```

### Verify in Supabase Dashboard:
1. Go to **Table Editor**
2. Click on **users** table
3. You should see a new user with phone number: `1234567890`
4. Click on **conversation_sessions** table
5. You should see a new session for that user
6. Click on **message_logs** table
7. You should see the logged message

## Troubleshooting

### "Cannot connect to Supabase"
- ✅ Check that `SUPABASE_URL` is correct in `.env`
- ✅ Check that `SUPABASE_SERVICE_KEY` is set
- ✅ Verify your Supabase project is active
- ✅ Test URL in browser: https://qrujzlrqnngythxnpmdg.supabase.co

### "Permission denied" errors
- ✅ Make sure you're using the **service_role** key, not the anon key
- ✅ The service role key has full database access

### "Table does not exist"
- ✅ Run the database schema SQL in Supabase dashboard
- ✅ Verify tables exist in Table Editor
- ✅ Check for any SQL execution errors

### Schema SQL execution errors
If you get errors running the schema:
1. Check if tables already exist - if so, drop them first:
   ```sql
   DROP TABLE IF EXISTS message_logs CASCADE;
   DROP TABLE IF EXISTS generated_documents CASCADE;
   DROP TABLE IF EXISTS certifications CASCADE;
   DROP TABLE IF EXISTS skills CASCADE;
   DROP TABLE IF EXISTS education CASCADE;
   DROP TABLE IF EXISTS work_experiences CASCADE;
   DROP TABLE IF EXISTS conversation_sessions CASCADE;
   DROP TABLE IF EXISTS cv_templates CASCADE;
   DROP TABLE IF EXISTS users CASCADE;
   ```
2. Then run the complete schema.sql again

## Security Notes

⚠️ **Important**: The service role key has full database access!

- ✅ Keep it secret - never commit to Git
- ✅ Only use it server-side
- ✅ Never expose it to client/browser
- ✅ `.env` is already in `.gitignore`

## Next Steps

Once Supabase is set up:

1. ✅ **Test locally** with the curl command above
2. ✅ **Add other API credentials** (OpenAI, WATI, etc.)
3. ✅ **Test full conversation flow**
4. ✅ **Deploy to production**

## Quick Reference

### Your Supabase Project
- **Project URL**: https://app.supabase.com/project/qrujzlrqnngythxnpmdg
- **API URL**: https://qrujzlrqnngythxnpmdg.supabase.co
- **SQL Editor**: https://app.supabase.com/project/qrujzlrqnngythxnpmdg/sql
- **Table Editor**: https://app.supabase.com/project/qrujzlrqnngythxnpmdg/editor

### Database Schema File
- **Location**: `database/schema.sql`
- **Tables**: 9 tables
- **Lines**: ~250 lines of SQL

## Need Help?

1. Check logs: `npm run start:dev` shows all errors
2. Check Supabase logs: Dashboard → Logs
3. Review database: Table Editor → Select table → View data

---

**Status Checklist**:
- ✅ Supabase URL configured
- ✅ Anon key configured
- ⏳ Service role key - **GET THIS NOW**
- ⏳ Database schema - **RUN SQL**
- ⏳ Test connection
- ⏳ Verify data creation
