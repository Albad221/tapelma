# SamaCV - Intelligent WhatsApp CV Generator

An intelligent CV generator accessible via WhatsApp that allows users to create professional resumes in minutes without leaving their messaging app.

## Features

- **WhatsApp Integration**: Complete CV creation through conversational interface via WATI
- **Multi-language Support**: English, French, Spanish, and more
- **AI-Powered Content**: OpenAI GPT for content optimization and generation
- **Professional Design**: Multiple Canva templates (Professional, Modern, Creative)
- **ATS Optimization**: Automatic analysis and optimization for Applicant Tracking Systems
- **Cover Letter Generation**: On-demand cover letter creation
- **Multiple Formats**: Export to PDF and DOCX
- **Cloud Storage**: Secure file storage on AWS S3
- **Database**: Persistent storage with Supabase

## Architecture

```
├── src/
│   ├── modules/
│   │   ├── whatsapp/         # WATI WhatsApp integration
│   │   ├── user/             # User and session management (Supabase)
│   │   ├── openai/           # OpenAI GPT integration
│   │   ├── canva/            # Canva API integration
│   │   ├── storage/          # AWS S3 file storage
│   │   └── cv-generation/    # CV generation orchestration
│   ├── common/
│   │   ├── dto/              # Data Transfer Objects
│   │   └── interfaces/       # TypeScript interfaces
│   └── main.ts
├── database/
│   └── schema.sql            # Supabase database schema
└── .env                      # Environment configuration
```

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- WATI account for WhatsApp Business API
- OpenAI API key
- Canva API credentials
- AWS account with S3 bucket

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd samacv
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

   Required environment variables:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_KEY` - Supabase anon/public key
   - `SUPABASE_SERVICE_KEY` - Supabase service role key
   - `WATI_API_ENDPOINT` - WATI API endpoint
   - `WATI_ACCESS_TOKEN` - WATI access token
   - `OPENAI_API_KEY` - OpenAI API key
   - `CANVA_API_KEY` - Canva API key
   - `CANVA_API_SECRET` - Canva API secret
   - `AWS_ACCESS_KEY_ID` - AWS access key
   - `AWS_SECRET_ACCESS_KEY` - AWS secret key
   - `AWS_S3_BUCKET` - S3 bucket name
   - `AWS_REGION` - AWS region

4. **Set up Supabase database**

   Run the database schema in your Supabase project:
   ```bash
   # Option 1: Via Supabase Dashboard
   # Copy the contents of database/schema.sql and run in SQL Editor

   # Option 2: Via Supabase CLI
   supabase db reset
   ```

5. **Configure WATI Webhook**

   In your WATI dashboard, set up a webhook pointing to:
   ```
   https://your-domain.com/api/webhook/whatsapp
   ```

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Watch mode
npm run start:dev
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Webhooks

- `POST /api/webhook/whatsapp` - Receive incoming WhatsApp messages
- `POST /api/webhook/status` - Receive message status updates

### Health Check

- `GET /api` - Basic health check

## Conversational Flow

1. **Greeting** - User initiates conversation
2. **Language Selection** - Choose preferred language
3. **Personal Information** - Name, email, phone, location
4. **Work Experience** - Add job positions with descriptions
5. **Education** - Add degrees and certifications
6. **Skills** - List technical and soft skills
7. **Languages** - Specify language proficiencies
8. **Certifications** - Add professional certifications (optional)
9. **Template Selection** - Choose CV design template
10. **Generation** - CV is generated, optimized, and delivered
11. **Follow-up** - Option to generate cover letter or create new CV

## How It Works

### User Interaction
1. User sends message to WhatsApp Business number
2. WATI forwards message to webhook endpoint
3. System identifies or creates user session
4. Conversational AI guides user through data collection

### CV Generation Process
1. Collect all required information through conversation
2. Optimize work experience descriptions using OpenAI
3. Generate professional summary
4. Analyze ATS compatibility
5. Create CV design using Canva template
6. Export to PDF and DOCX formats
7. Upload files to AWS S3
8. Send documents back to user via WhatsApp

### Database Structure

**Main Tables:**
- `users` - User profiles
- `conversation_sessions` - Active conversation states
- `work_experiences` - Job history
- `education` - Educational background
- `skills` - User skills
- `certifications` - Professional certifications
- `generated_documents` - Generated CVs and cover letters
- `message_logs` - Message history for analytics

## Development

### Project Structure

```
src/
├── modules/
│   ├── whatsapp/
│   │   ├── whatsapp.service.ts      # WATI API integration
│   │   ├── whatsapp.controller.ts   # Webhook handler
│   │   └── whatsapp.module.ts
│   ├── user/
│   │   ├── user.service.ts          # Database operations
│   │   └── user.module.ts
│   ├── openai/
│   │   ├── openai.service.ts        # GPT integration
│   │   └── openai.module.ts
│   ├── canva/
│   │   ├── canva.service.ts         # Canva API integration
│   │   └── canva.module.ts
│   ├── storage/
│   │   ├── storage.service.ts       # AWS S3 operations
│   │   └── storage.module.ts
│   └── cv-generation/
│       ├── conversation.service.ts   # Conversation flow logic
│       ├── cv-generation.service.ts  # CV orchestration
│       └── cv-generation.module.ts
└── common/
    ├── dto/                          # Data Transfer Objects
    └── interfaces/                   # TypeScript interfaces
```

### Adding New Templates

1. Create template in Canva
2. Note the template ID
3. Add template mapping in `canva.service.ts`
4. Update template selection in `conversation.service.ts`

### Adding New Languages

1. Add language translations in conversation service
2. Update language selection buttons
3. Add language to OpenAI prompts
4. Update i18n configuration

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Deployment

### Using Docker

```bash
# Build image
docker build -t samacv .

# Run container
docker run -p 3000:3000 --env-file .env samacv
```

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/main.js --name samacv

# Monitor
pm2 logs samacv
pm2 monit
```

### Environment Variables for Production

Ensure these are set in production:
- `NODE_ENV=production`
- All API credentials properly configured
- CORS settings adjusted for your domain
- Database connection pooling optimized
- S3 bucket with proper permissions

## Monitoring and Logging

The application logs all:
- Incoming/outgoing WhatsApp messages
- API calls to external services
- Errors and exceptions
- User sessions and CV generations

Logs are accessible via:
- Console output (development)
- File system (production with winston/morgan)
- Cloud logging service (AWS CloudWatch, etc.)

## Security Considerations

- API keys stored in environment variables
- Webhook signature validation
- Rate limiting on endpoints
- Input validation and sanitization
- Secure file storage with signed URLs
- Database row-level security (Supabase)

## Troubleshooting

### Common Issues

**Webhook not receiving messages:**
- Check WATI webhook configuration
- Verify endpoint is publicly accessible
- Check webhook signature validation

**CV generation failing:**
- Verify all API credentials
- Check Canva template IDs
- Ensure S3 bucket permissions are correct
- Review OpenAI API quota

**Database connection issues:**
- Verify Supabase credentials
- Check network connectivity
- Review database schema

## License

MIT License

## Support

For support, please contact: support@samacv.com

## Roadmap

- [ ] Support for more languages
- [ ] Additional CV templates
- [ ] Resume parsing from existing CVs
- [ ] Job matching recommendations
- [ ] LinkedIn profile import
- [ ] Interview preparation tips
- [ ] Resume version management
- [ ] Analytics dashboard
- [ ] Batch CV generation for recruitment agencies
- [ ] Integration with job boards

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Acknowledgments

- NestJS framework
- WATI for WhatsApp Business API
- OpenAI for GPT models
- Canva for design templates
- Supabase for database
- AWS for cloud storage
