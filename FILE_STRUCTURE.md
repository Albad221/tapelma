# SamaCV - Complete File Structure

## Project Root
```
samacv/
├── .env                          # Environment variables (DO NOT commit)
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── .dockerignore                 # Docker ignore rules
├── .prettierrc                   # Code formatting config
├── Dockerfile                    # Docker container definition
├── docker-compose.yml            # Docker compose configuration
├── eslint.config.mjs            # ESLint configuration
├── nest-cli.json                # NestJS CLI config
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── tsconfig.build.json          # Build configuration
├── README.md                    # Main documentation
├── SETUP_GUIDE.md               # Detailed setup instructions
├── PROJECT_SUMMARY.md           # Project overview
└── FILE_STRUCTURE.md            # This file
```

## Database
```
database/
└── schema.sql                   # Complete Supabase database schema
    ├── Tables:
    │   ├── users
    │   ├── conversation_sessions
    │   ├── work_experiences
    │   ├── education
    │   ├── skills
    │   ├── certifications
    │   ├── generated_documents
    │   ├── message_logs
    │   └── cv_templates
    ├── Indexes
    ├── Triggers
    └── Functions
```

## Source Code (src/)

### Main Application
```
src/
├── main.ts                      # Application entry point
│   ├── Bootstrap function
│   ├── CORS configuration
│   ├── Validation pipes
│   └── Global prefix setup
│
├── app.module.ts                # Root module
│   └── Imports all feature modules
│
├── app.controller.ts            # Root controller
├── app.controller.spec.ts       # Controller tests
└── app.service.ts               # Root service
```

### Common Utilities
```
src/common/
├── dto/                         # Data Transfer Objects
│   ├── cv-generation.dto.ts    # CV data validation
│   │   ├── PersonalInfoDto
│   │   ├── WorkExperienceDto
│   │   ├── EducationDto
│   │   ├── SkillDto
│   │   ├── CertificationDto
│   │   ├── LanguageDto
│   │   └── GenerateCVDto
│   │
│   └── whatsapp-message.dto.ts # WhatsApp message DTOs
│       ├── WhatsAppMessageDto
│       ├── SendMessageDto
│       ├── SendTemplateMessageDto
│       └── SendMediaMessageDto
│
└── interfaces/                  # TypeScript interfaces
    └── cv-data.interface.ts    # Core data interfaces
        ├── ConversationStep enum
        ├── SessionStatus enum
        ├── PersonalInfo interface
        ├── WorkExperience interface
        ├── Education interface
        ├── Skill interface
        ├── Certification interface
        ├── Language interface
        ├── CVData interface
        ├── ConversationSession interface
        ├── User interface
        └── GeneratedDocument interface
```

### Feature Modules

#### 1. WhatsApp Module
```
src/modules/whatsapp/
├── whatsapp.module.ts           # Module definition
├── whatsapp.service.ts          # WATI API integration
│   ├── sendTextMessage()
│   ├── sendInteractiveButtons()
│   ├── sendListMessage()
│   ├── sendMediaMessage()
│   ├── sendTemplateMessage()
│   ├── markMessageAsRead()
│   ├── parseIncomingMessage()
│   └── validateWebhookSignature()
│
└── whatsapp.controller.ts       # Webhook endpoints
    ├── POST /webhook/whatsapp   # Message handler
    └── POST /webhook/status     # Status updates
```

#### 2. User Module
```
src/modules/user/
├── user.module.ts               # Module definition
└── user.service.ts              # Database operations
    ├── Supabase client setup
    ├── findOrCreateUser()
    ├── updateUser()
    ├── getActiveSession()
    ├── createSession()
    ├── updateSession()
    ├── saveWorkExperience()
    ├── saveEducation()
    ├── saveSkills()
    ├── saveCertifications()
    ├── saveGeneratedDocument()
    ├── logMessage()
    └── Helper mapping functions
```

#### 3. OpenAI Module
```
src/modules/openai/
├── openai.module.ts             # Module definition
└── openai.service.ts            # GPT integration
    ├── OpenAI client setup
    ├── optimizeWorkExperience() # Enhance job descriptions
    ├── generateProfessionalSummary() # Create CV summary
    ├── analyzeATSCompatibility() # ATS scoring
    ├── generateCoverLetter()    # Cover letter creation
    ├── extractStructuredInfo()  # NLP data extraction
    └── translateContent()       # Multi-language support
```

#### 4. Canva Module
```
src/modules/canva/
├── canva.module.ts              # Module definition
└── canva.service.ts             # Canva API integration
    ├── Canva client setup
    ├── createCVFromTemplate()   # Create design
    ├── populateDesignWithData() # Fill template
    ├── mapCVDataToCanvaFormat() # Data mapping
    ├── exportDesignToPDF()      # PDF export
    ├── exportDesignToDOCX()     # DOCX export
    ├── waitForExportCompletion() # Polling
    ├── listAvailableTemplates() # Template catalog
    └── duplicateDesign()        # Clone design
```

#### 5. Storage Module
```
src/modules/storage/
├── storage.module.ts            # Module definition
└── storage.service.ts           # AWS S3 operations
    ├── S3 client setup
    ├── uploadFile()             # Upload buffer
    ├── uploadFromUrl()          # Upload from URL
    ├── getSignedUrl()           # Generate access URL
    ├── deleteFile()             # Delete from S3
    ├── getFileBuffer()          # Download file
    └── getPublicUrl()           # Public URL
```

#### 6. CV Generation Module
```
src/modules/cv-generation/
├── cv-generation.module.ts      # Module definition
│
├── conversation.service.ts      # Conversation flow
│   ├── handleUserMessage()      # Main message handler
│   ├── processConversationStep() # Route to step handler
│   ├── handleGreeting()         # Step 1
│   ├── handleLanguageSelection() # Step 2
│   ├── handlePersonalInfo()     # Step 3
│   ├── handleWorkExperience()   # Step 4
│   ├── handleEducation()        # Step 5
│   ├── handleSkills()           # Step 6
│   ├── handleLanguages()        # Step 7
│   ├── handleCertifications()   # Step 8
│   ├── handleTemplateSelection() # Step 9
│   ├── handleReview()           # Step 10
│   └── proceedToTemplateSelection() # Helper
│
└── cv-generation.service.ts     # CV orchestration
    ├── generateCV()             # Main generation flow
    ├── generateCoverLetter()    # Cover letter flow
    ├── sendGeneratedCVToUser()  # Delivery
    ├── getATSFeedback()         # Feedback messages
    ├── mapTemplateId()          # Template mapping
    └── optimizeCVForATS()       # Additional optimization
```

## Test Files
```
test/
├── app.e2e-spec.ts             # End-to-end tests
└── jest-e2e.json               # E2E test config
```

## Key Features by File

### 1. Conversation Flow (conversation.service.ts)
- **Multi-language support**: EN, FR, ES
- **State machine**: Step-by-step progression
- **NLP integration**: Extract structured data from text
- **Interactive messages**: Buttons, lists
- **Error handling**: Graceful fallbacks
- **Session management**: Track user progress

### 2. CV Generation (cv-generation.service.ts)
- **Content optimization**: AI-enhanced descriptions
- **Professional summary**: Auto-generated
- **ATS analysis**: Compatibility scoring
- **Multi-format export**: PDF & DOCX
- **Cloud storage**: S3 upload
- **Delivery**: WhatsApp document send

### 3. Database Operations (user.service.ts)
- **User management**: CRUD operations
- **Session tracking**: Active conversation states
- **Data persistence**: Work, education, skills
- **Document records**: Generated CVs
- **Message logging**: Audit trail

### 4. WhatsApp Integration (whatsapp.service.ts)
- **Message types**: Text, interactive, media
- **Webhook handling**: Incoming messages
- **Status tracking**: Message delivery
- **Fallbacks**: Plain text for unsupported features

### 5. AI Integration (openai.service.ts)
- **GPT-4 Turbo**: Advanced language model
- **Prompt engineering**: Optimized prompts
- **JSON responses**: Structured output
- **Multi-language**: Translation support
- **Cost optimization**: Temperature control

## Environment Variables (.env)

### Application
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port

### Supabase
- `SUPABASE_URL`: Project URL
- `SUPABASE_KEY`: Anon key
- `SUPABASE_SERVICE_KEY`: Service role key

### WATI
- `WATI_API_ENDPOINT`: API base URL
- `WATI_ACCESS_TOKEN`: Authentication token
- `WATI_WEBHOOK_SECRET`: Webhook validation

### OpenAI
- `OPENAI_API_KEY`: API key
- `OPENAI_MODEL`: Model selection
- `OPENAI_TEMPERATURE`: Creativity level

### Canva
- `CANVA_API_KEY`: API key
- `CANVA_API_SECRET`: API secret
- `CANVA_BASE_URL`: API endpoint

### AWS
- `AWS_REGION`: S3 region
- `AWS_ACCESS_KEY_ID`: Access key
- `AWS_SECRET_ACCESS_KEY`: Secret key
- `AWS_S3_BUCKET`: Bucket name

### Settings
- `MAX_FILE_SIZE_MB`: Upload limit
- `SESSION_TIMEOUT_MINUTES`: Inactivity timeout
- `DEFAULT_LANGUAGE`: Default language

## Docker Files

### Dockerfile
- **Multi-stage build**: Smaller image
- **Node 18 Alpine**: Minimal base
- **Production dependencies**: Only what's needed
- **Port 3000**: Exposed

### docker-compose.yml
- **Service definition**: App container
- **Environment**: From .env file
- **Volumes**: Logs persistence
- **Networks**: Isolated network
- **Restart policy**: Unless stopped

## Scripts (package.json)

### Development
```bash
npm run start:dev    # Watch mode
npm run start:debug  # Debug mode
```

### Production
```bash
npm run build        # Compile TypeScript
npm run start:prod   # Run production
```

### Testing
```bash
npm run test         # Unit tests
npm run test:e2e     # E2E tests
npm run test:cov     # Coverage report
```

### Linting
```bash
npm run lint         # Check code style
npm run format       # Format code
```

## File Relationships

```
Incoming WhatsApp Message
    ↓
whatsapp.controller.ts
    ↓
conversation.service.ts
    ├─→ user.service.ts (save data)
    ├─→ openai.service.ts (process text)
    └─→ whatsapp.service.ts (send response)

CV Generation Trigger
    ↓
cv-generation.service.ts
    ├─→ openai.service.ts (optimize)
    ├─→ canva.service.ts (design)
    ├─→ storage.service.ts (upload)
    ├─→ user.service.ts (save record)
    └─→ whatsapp.service.ts (deliver)
```

## Import Structure

### Module Dependencies
```
app.module
├── ConfigModule (global)
├── UserModule
│   └── UserService
├── WhatsAppModule
│   ├── HttpModule
│   ├── WhatsAppService
│   └── WhatsAppController
├── OpenAIModule
│   └── OpenAIService
├── CanvaModule
│   ├── HttpModule
│   └── CanvaService
├── StorageModule
│   └── StorageService
└── CVGenerationModule
    ├── UserModule
    ├── OpenAIModule
    ├── CanvaModule
    ├── StorageModule
    ├── WhatsAppModule
    ├── ConversationService
    └── CVGenerationService
```

## Total Lines of Code (Estimated)

- **Database Schema**: ~250 lines
- **TypeScript Source**: ~2,500 lines
- **DTOs & Interfaces**: ~400 lines
- **Configuration**: ~100 lines
- **Documentation**: ~1,500 lines
- **Total**: ~4,750 lines

## Summary

This project includes:
- ✅ 22 TypeScript files
- ✅ 6 feature modules
- ✅ 9 database tables
- ✅ 4 API integrations
- ✅ Complete conversation flow
- ✅ CV generation pipeline
- ✅ Multi-language support
- ✅ Docker deployment
- ✅ Comprehensive documentation

All files are production-ready and following NestJS best practices!
