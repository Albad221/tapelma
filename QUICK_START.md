# Quick Start Guide - SamaCV

Get your WhatsApp CV Generator up and running in 15 minutes!

## Prerequisites Checklist
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed (optional)

## Step 1: Installation (2 minutes)

```bash
# Navigate to project directory
cd samacv

# Install dependencies
npm install

# Verify installation
npm run build
```

**Expected output**: Build completes successfully ✅

## Step 2: Environment Setup (5 minutes)

Create your `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add **at minimum** these credentials to start:

### Required for Basic Testing
```env
NODE_ENV=development
PORT=3000

# Supabase (Sign up at supabase.com)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# OpenAI (Get from platform.openai.com)
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-3.5-turbo  # Start with 3.5 for lower costs
OPENAI_TEMPERATURE=0.7

# Use placeholders for services you haven't set up yet
WATI_API_ENDPOINT=https://live-server.wati.io
WATI_ACCESS_TOKEN=placeholder
CANVA_API_KEY=placeholder
CANVA_API_SECRET=placeholder
CANVA_BASE_URL=https://api.canva.com/v1
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=placeholder
AWS_SECRET_ACCESS_KEY=placeholder
AWS_S3_BUCKET=placeholder
```

## Step 3: Database Setup (5 minutes)

### Option A: Supabase Dashboard (Easiest)
1. Go to your Supabase project at [app.supabase.com](https://app.supabase.com)
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `database/schema.sql`
5. Paste into the SQL Editor
6. Click "Run" or press Ctrl+Enter
7. Verify tables are created in "Table Editor"

### Option B: Supabase CLI
```bash
supabase init
supabase db reset
```

## Step 4: Start the Application (1 minute)

```bash
# Development mode with hot reload
npm run start:dev
```

**Expected output**:
```
Application is running on: http://localhost:3000
Webhook endpoint: http://localhost:3000/api/webhook/whatsapp
```

## Step 5: Quick Test (2 minutes)

### Test 1: Health Check
```bash
curl http://localhost:3000/api
```

**Expected**: Basic response showing the app is running

### Test 2: Webhook Endpoint (Simulated Message)
```bash
curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "waId": "1234567890",
    "text": "start",
    "id": "test-msg-1",
    "type": "text",
    "timestamp": 1234567890
  }'
```

**Expected**: Response `{ "status": "processed" }`

Check your Supabase database - you should see:
- New user in `users` table
- New session in `conversation_sessions` table
- Message logged in `message_logs` table

## What's Next?

### Priority 1: Enable WhatsApp Integration
1. Sign up at [WATI.io](https://www.wati.io)
2. Get your API credentials
3. Update `.env` with WATI credentials
4. Configure webhook in WATI dashboard

[See SETUP_GUIDE.md for detailed WATI setup]

### Priority 2: Enable Document Generation
1. Set up AWS S3 bucket
2. Create Canva templates (or use mock templates)
3. Update credentials in `.env`

### Priority 3: Production Deployment
- Deploy to cloud platform (Heroku, DigitalOcean, etc.)
- Set up domain and SSL
- Configure WATI webhook to production URL
- Set up monitoring and logging

## Development Workflow

### Running the Application
```bash
# Development with hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

### Testing Your Changes
```bash
# Run tests
npm run test

# Watch mode for testing
npm run test:watch

# Test coverage
npm run test:cov
```

### Common Development Tasks

**Viewing Logs**:
```bash
# Logs appear in console when running in dev mode
npm run start:dev
```

**Checking Database**:
- Go to Supabase Dashboard > Table Editor
- View `users`, `conversation_sessions`, `message_logs`

**Testing Conversation Flow**:
1. Send POST request to webhook with different messages
2. Check database for state changes
3. Review console logs

## Troubleshooting

### "Cannot connect to database"
- Verify Supabase credentials in `.env`
- Check if Supabase project is active
- Test connection: Visit `SUPABASE_URL` in browser

### "OpenAI API error"
- Verify API key is correct
- Check OpenAI account has credits
- Test with gpt-3.5-turbo first (cheaper)

### "Port 3000 already in use"
- Change PORT in `.env`
- Or kill process: `lsof -ti:3000 | xargs kill`

### Build errors
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

## Project Structure Overview

```
samacv/
├── src/
│   ├── modules/
│   │   ├── whatsapp/      # WhatsApp integration
│   │   ├── user/          # Database operations
│   │   ├── openai/        # AI content generation
│   │   ├── canva/         # CV design
│   │   ├── storage/       # File storage
│   │   └── cv-generation/ # Main orchestration
│   ├── common/            # Shared code
│   └── main.ts            # Application entry
├── database/
│   └── schema.sql         # Database schema
├── .env                   # Your configuration
└── README.md              # Full documentation
```

## Key Files to Know

- **src/modules/cv-generation/conversation.service.ts** - Conversation flow logic
- **src/modules/cv-generation/cv-generation.service.ts** - CV generation
- **src/modules/user/user.service.ts** - Database operations
- **src/modules/whatsapp/whatsapp.controller.ts** - Webhook handler

## Environment Setup Checklist

✅ **Minimal (for local testing)**:
- [x] Node.js & npm
- [x] Supabase account & database
- [x] OpenAI API key
- [ ] Other services (can use placeholders)

✅ **Development (for full testing)**:
- [x] All of the above
- [x] WATI account (for WhatsApp)
- [ ] Canva API (or mock)
- [ ] AWS S3 (or mock)

✅ **Production (for deployment)**:
- [x] All of the above
- [x] Domain & SSL certificate
- [x] Production database
- [x] Monitoring setup
- [x] Backup strategy

## Quick Commands Reference

```bash
# Installation & Build
npm install                    # Install dependencies
npm run build                  # Build the project

# Running
npm run start                  # Start (production)
npm run start:dev              # Start (development)
npm run start:debug            # Start (debug mode)

# Testing
npm run test                   # Run tests
npm run test:watch             # Watch mode
npm run test:e2e              # E2E tests
npm run test:cov              # Coverage

# Code Quality
npm run lint                   # Lint code
npm run format                 # Format code

# Docker
docker build -t samacv .       # Build image
docker-compose up -d           # Start with compose
```

## Getting Help

1. **Check the logs**: Most issues show clear error messages
2. **Review documentation**:
   - `README.md` - Full documentation
   - `SETUP_GUIDE.md` - Detailed setup instructions
   - `PROJECT_SUMMARY.md` - Architecture overview
3. **Common issues**: Check Troubleshooting section above
4. **GitHub Issues**: Report bugs or ask questions

## Next Steps After Quick Start

1. ✅ Complete WATI WhatsApp setup
2. ✅ Test full conversation flow via WhatsApp
3. ✅ Set up Canva templates
4. ✅ Configure AWS S3 storage
5. ✅ Test complete CV generation
6. ✅ Deploy to production
7. ✅ Set up monitoring and alerts

## Success Indicators

You know everything is working when:
- ✅ Application starts without errors
- ✅ Webhook receives and processes messages
- ✅ Database records are created
- ✅ OpenAI generates optimized content
- ✅ CVs are generated and delivered
- ✅ Files are stored securely

## Development Tips

1. **Start simple**: Get basic conversation working first
2. **Use logs**: Add `this.logger.log()` to debug
3. **Test incrementally**: Test each module separately
4. **Mock external services**: Use placeholders during development
5. **Version control**: Commit working code frequently

---

**Time to First CV**: With all services configured, a user can generate their first CV in approximately **5-10 minutes** of conversation!

**Ready to go deeper?** Check out:
- `SETUP_GUIDE.md` - Complete setup for all services
- `PROJECT_SUMMARY.md` - Architecture and design decisions
- `README.md` - Full feature documentation
