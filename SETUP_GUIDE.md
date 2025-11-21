# SamaCV Setup Guide

Complete step-by-step guide to set up the SamaCV WhatsApp CV Generator.

## Table of Contents
1. [Prerequisites Setup](#prerequisites-setup)
2. [Database Setup (Supabase)](#database-setup)
3. [WATI WhatsApp Setup](#wati-setup)
4. [OpenAI Setup](#openai-setup)
5. [Canva API Setup](#canva-setup)
6. [AWS S3 Setup](#aws-s3-setup)
7. [Application Configuration](#application-configuration)
8. [Testing](#testing)
9. [Deployment](#deployment)

---

## Prerequisites Setup

### 1. Install Node.js
```bash
# Download and install Node.js 18+ from nodejs.org
node --version  # Should be v18 or higher
npm --version
```

### 2. Clone Repository
```bash
git clone <repository-url>
cd samacv
npm install
```

---

## Database Setup (Supabase)

### 1. Create Supabase Account
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project

### 2. Get API Credentials
1. Go to Project Settings > API
2. Copy the following:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon/public` key
   - `service_role` key (secret)

### 3. Run Database Schema
1. In Supabase Dashboard, go to SQL Editor
2. Copy contents of `database/schema.sql`
3. Run the SQL script
4. Verify tables are created in Table Editor

### 4. Configure Row Level Security (Optional but Recommended)
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
-- ... repeat for other tables

-- Add policies as needed for your use case
```

---

## WATI Setup

### 1. Create WATI Account
1. Go to [https://www.wati.io](https://www.wati.io)
2. Sign up and verify your WhatsApp Business account
3. Complete the onboarding process

### 2. Get API Credentials
1. Go to Settings > API
2. Copy your **API Endpoint** (usually `https://live-server.wati.io`)
3. Generate an **Access Token**
4. Save these credentials

### 3. Configure Webhook
1. In WATI Dashboard, go to Settings > Webhooks
2. Add new webhook URL:
   ```
   https://your-domain.com/api/webhook/whatsapp
   ```
3. Select events to receive:
   - Message Received
   - Message Status Updates
4. Save webhook configuration

### 4. Test Webhook (Local Development)
Use ngrok for local testing:
```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run start:dev

# In another terminal, expose port 3000
ngrok http 3000

# Use the ngrok URL in WATI webhook settings
# e.g., https://xxxx.ngrok.io/api/webhook/whatsapp
```

---

## OpenAI Setup

### 1. Create OpenAI Account
1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Add billing information

### 2. Generate API Key
1. Go to API Keys section
2. Click "Create new secret key"
3. Copy and save the key (you won't see it again!)
4. Recommended: Set usage limits to control costs

### 3. Choose Model
The application uses `gpt-4-turbo-preview` by default. You can change this in `.env`:
```env
OPENAI_MODEL=gpt-4-turbo-preview  # or gpt-3.5-turbo for lower costs
```

---

## Canva API Setup

### 1. Canva Developer Account
1. Go to [https://www.canva.com/developers](https://www.canva.com/developers)
2. Apply for API access
3. Wait for approval (can take a few days)

### 2. Create Application
1. Once approved, create a new application
2. Get your API credentials:
   - API Key
   - API Secret

### 3. Create CV Templates
1. Design CV templates in Canva
2. Note the template IDs
3. Update template mappings in `src/modules/canva/canva.service.ts`

### 4. Alternative: Use Canva Connect
If full API access is not available, you can use Canva Connect:
1. Enable Canva Connect in your account
2. Use autofill API for template population
3. Follow Canva documentation for setup

---

## AWS S3 Setup

### 1. Create AWS Account
1. Go to [https://aws.amazon.com](https://aws.amazon.com)
2. Sign up for an account (free tier available)

### 2. Create IAM User
1. Go to IAM Console
2. Create new user: `samacv-s3-user`
3. Attach policy: `AmazonS3FullAccess` (or create custom policy)
4. Save Access Key ID and Secret Access Key

### 3. Create S3 Bucket
```bash
# Using AWS CLI (or use AWS Console)
aws s3 mb s3://samacv-files --region us-east-1

# Configure bucket policy
aws s3api put-bucket-cors --bucket samacv-files --cors-configuration file://s3-cors.json
```

Example `s3-cors.json`:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### 4. Configure Bucket Settings
1. Block public access (recommended)
2. Enable versioning (optional)
3. Configure lifecycle rules for automatic cleanup (optional)

---

## Application Configuration

### 1. Environment Variables
Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Fill in all credentials:
```env
# Application
NODE_ENV=development
PORT=3000

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# WATI
WATI_API_ENDPOINT=https://live-server.wati.io
WATI_ACCESS_TOKEN=your-wati-token
WATI_WEBHOOK_SECRET=your-webhook-secret

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_TEMPERATURE=0.7

# Canva
CANVA_API_KEY=your-canva-key
CANVA_API_SECRET=your-canva-secret
CANVA_BASE_URL=https://api.canva.com/v1

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=samacv-files

# Settings
MAX_FILE_SIZE_MB=10
SESSION_TIMEOUT_MINUTES=30
DEFAULT_LANGUAGE=en
```

### 2. Verify Configuration
```bash
# Test database connection
npm run start:dev

# Check logs for any connection errors
# You should see: "Application is running on: http://localhost:3000"
```

---

## Testing

### 1. Test Webhook Endpoint
```bash
curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "waId": "1234567890",
    "text": "Hello"
  }'
```

### 2. Test Via WhatsApp
1. Send a message to your WATI WhatsApp number
2. Type "start" or "hello"
3. Bot should respond with welcome message
4. Follow the conversation flow

### 3. Monitor Logs
```bash
# Watch application logs
npm run start:dev

# Check database for new records
# Go to Supabase Dashboard > Table Editor > users
```

---

## Deployment

### Option 1: Deploy to Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create samacv-app

# Set environment variables
heroku config:set SUPABASE_URL=your-url
heroku config:set SUPABASE_KEY=your-key
# ... set all other variables

# Deploy
git push heroku main

# Update WATI webhook URL to:
# https://samacv-app.herokuapp.com/api/webhook/whatsapp
```

### Option 2: Deploy to DigitalOcean

```bash
# Create Droplet (Ubuntu 22.04)
# SSH into droplet

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone <repo-url>
cd samacv
npm install
npm run build

# Install PM2
sudo npm install -g pm2

# Start application
pm2 start dist/main.js --name samacv

# Setup PM2 startup
pm2 startup
pm2 save

# Setup Nginx reverse proxy
sudo apt install nginx
# Configure nginx to proxy to port 3000
```

### Option 3: Deploy with Docker

```bash
# Build image
docker build -t samacv:latest .

# Run container
docker run -d \
  --name samacv \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  samacv:latest

# Or use docker-compose
docker-compose up -d
```

---

## Troubleshooting

### Database Connection Issues
```bash
# Test Supabase connection
curl -X GET "https://your-project.supabase.co/rest/v1/users" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

### WATI Webhook Not Working
1. Check webhook URL is accessible publicly
2. Verify HTTPS is enabled (WATI requires HTTPS)
3. Check webhook logs in WATI dashboard
4. Test with curl or Postman

### OpenAI Rate Limits
1. Check your usage at platform.openai.com
2. Set up rate limiting in application
3. Consider caching responses
4. Use gpt-3.5-turbo for lower costs

### S3 Upload Failures
1. Verify IAM permissions
2. Check bucket policy
3. Ensure CORS is configured
4. Test with AWS CLI first

---

## Support

For issues or questions:
- Check the main README.md
- Review error logs
- Contact support@samacv.com

## Next Steps

After successful setup:
1. Test complete user flow
2. Customize conversation messages
3. Add more CV templates
4. Set up monitoring and alerts
5. Configure backup strategy
6. Implement analytics tracking
