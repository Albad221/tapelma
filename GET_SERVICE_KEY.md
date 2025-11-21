# 🔑 How to Get Your Supabase Service Role Key

## Quick Link
👉 **Direct Link**: https://app.supabase.com/project/qrujzlrqnngythxnpmdg/settings/api

## Step-by-Step (with screenshots reference)

### Step 1: Go to Your Project Settings
1. Open: https://app.supabase.com/project/qrujzlrqnngythxnpmdg
2. Look at the left sidebar
3. Click the **⚙️ Settings** icon (at the bottom)

### Step 2: Navigate to API Settings
1. In Settings, click **API** from the menu
2. Or use direct link: https://app.supabase.com/project/qrujzlrqnngythxnpmdg/settings/api

### Step 3: Find Project API Keys Section
Scroll down to the section titled **"Project API keys"**

You'll see several keys:

```
┌─────────────────────────────────────────────────────┐
│ Project API keys                                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│ anon                                                 │
│ public                                               │
│ This key is safe to use in a browser if you have    │
│ enabled Row Level Security for your tables          │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...             │
│ [ALREADY CONFIGURED IN YOUR .env] ✅                │
│                                                      │
│ service_role                                         │
│ secret                                               │
│ This key has the ability to bypass Row Level        │
│ Security. Never share it publicly.                  │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...             │
│ [CLICK "COPY" BUTTON HERE] 👈 THIS IS WHAT YOU NEED │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Step 4: Copy the Service Role Key
1. Find the **"service_role"** key (marked as "secret")
2. Click the **Copy** button or **"Reveal"** button
3. Copy the entire key (starts with `eyJhbGc...`)

⚠️ **Important**:
- This is the **service_role** key (NOT the anon key)
- It's marked as "secret"
- It has full database access
- Keep it secure!

### Step 5: Add to Your .env File

1. Open `.env` file in your project
2. Find this line:
   ```
   SUPABASE_SERVICE_KEY=your-supabase-service-role-key
   ```

3. Replace with your actual key:
   ```
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydWp6bHJxbm5neXRoeG5wbWRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM3NDQ4NywiZXhwIjoyMDc4OTUwNDg3fQ.YOUR-ACTUAL-SERVICE-KEY
   ```

4. Save the file

## What Each Key Does

### Anon Key (Already in your .env ✅)
- **Purpose**: Client-side access
- **Security**: Safe for browsers
- **Access**: Respects Row Level Security (RLS)
- **Usage**: Frontend applications

### Service Role Key (You need this! ⚠️)
- **Purpose**: Server-side access
- **Security**: MUST be kept secret
- **Access**: Full database access (bypasses RLS)
- **Usage**: Backend/server operations
- **Why we need it**: SamaCV runs on the server and needs full access

## Verify You Have the Right Key

The service role key should:
- ✅ Start with `eyJhbGc...`
- ✅ Be very long (300+ characters)
- ✅ Be labeled as "service_role" in Supabase
- ✅ Be marked as "secret"

## After Adding the Key

Test it works:
```bash
node test-supabase.js
```

Expected output:
```
✅ Database connection successful!
```

## Security Reminder

🔒 **NEVER**:
- Commit service key to Git (already protected by .gitignore ✅)
- Share publicly
- Use in frontend/browser code
- Expose in API responses

✅ **ALWAYS**:
- Keep in .env file
- Use only server-side
- Treat as a password
- Rotate if exposed

## Troubleshooting

### "Cannot find service_role key"
- Make sure you're on the API page
- Scroll down to "Project API keys" section
- Look for the key marked "secret"

### "Key not working"
- Make sure you copied the entire key
- No extra spaces or line breaks
- Using service_role, not anon key
- Project is still active

### "Permission denied"
- You might be using anon key instead
- Check you copied service_role
- Verify key is correctly pasted in .env

## Quick Reference

**Your Supabase Dashboard URLs:**
- Main: https://app.supabase.com/project/qrujzlrqnngythxnpmdg
- API Settings: https://app.supabase.com/project/qrujzlrqnngythxnpmdg/settings/api
- SQL Editor: https://app.supabase.com/project/qrujzlrqnngythxnpmdg/sql
- Table Editor: https://app.supabase.com/project/qrujzlrqnngythxnpmdg/editor

**Current Status:**
- ✅ Supabase URL: `https://qrujzlrqnngythxnpmdg.supabase.co`
- ✅ Anon Key: Configured
- ⏳ Service Key: **← Get this now!**
- ⏳ Database Schema: Run after getting service key

## Next Steps After Getting Key

1. ✅ Add service key to `.env`
2. Run database schema SQL
3. Test with `node test-supabase.js`
4. Start the app with `npm run start:dev`

---

**Time to complete**: 2-3 minutes
**Difficulty**: Easy
**Importance**: Critical ⚠️ (app won't work without it)
