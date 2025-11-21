# Image Editing Module - Quick Reference

## Quick Start

### 1. Basic Usage in Code

```typescript
// Inject the service
constructor(
  private geminiService: GeminiService,
  private openaiService: OpenAIService,
) {}

// Analyze image
const analysis = await this.openaiService.analyzeCVPicture(
  imageBase64,
  'fr' // language
);

// Generate professional version if needed
if (!analysis.isSuitable) {
  const professionalPhoto = await this.geminiService.generateProfessionalCVPicture(
    'Software Engineer', // job description
    'en',               // language
    imageBase64         // original image
  );
}
```

### 2. Test via Web Interface

```bash
# 1. Start server
npm run start:dev

# 2. Open browser
open http://localhost:3000

# 3. Upload image and test
```

### 3. Test via API

```bash
curl -X POST http://localhost:3000/api/picture-test/analyze-and-generate \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "your_base64_image_here",
    "description": "menuisier",
    "language": "fr"
  }'
```

## Profession Type Detection

| Job Description Keywords | Detected Style | Background |
|-------------------------|----------------|------------|
| CEO, CTO, Director, Président | Executive | Corporate office with windows |
| Avocat, Lawyer, Juriste | Legal | Traditional office with law books |
| Médecin, Doctor, Infirmier | Healthcare | Medical office with equipment |
| Thérapeute, Psychologue | Therapist | Peaceful office with plants |
| Artiste, Designer, Photographe | Creative | Art studio with canvases |
| Influenceur, Content Creator | Content Creator | Instagram-worthy location |
| Immobilier, Real Estate | Real Estate | Upscale property |
| Entrepreneur, Startup Founder | Entrepreneur | Startup office |
| Menuisier, Plombier, Électricien | Trades | Clean workshop |
| *Any other* | General | Modern co-working space |

## API Endpoints

### Analyze Only
```http
POST /api/picture-test/analyze
Content-Type: application/json

{
  "imageBase64": "...",
  "language": "fr"
}
```

### Generate Only
```http
POST /api/picture-test/generate
Content-Type: application/json

{
  "description": "CEO",
  "language": "en"
}
```

### Analyze + Generate (Recommended)
```http
POST /api/picture-test/analyze-and-generate
Content-Type: application/json

{
  "imageBase64": "...",
  "description": "menuisier",
  "language": "fr"
}
```

## Configuration

### Required Environment Variables
```bash
# .env
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### Module Import
```typescript
// your.module.ts
import { GeminiModule } from '../gemini/gemini.module';
import { OpenAIModule } from '../openai/openai.module';

@Module({
  imports: [
    GeminiModule,
    OpenAIModule,
  ],
})
export class YourModule {}
```

## Adding New Profession Types

### Step 1: Add Detection Pattern
```typescript
// gemini.service.ts - determinePromptStyle()

// Add this inside the method
if (desc.match(/your_job_keywords|related_terms/i)) {
  return 'your_profession_type';
}
```

### Step 2: Add Prompts
```typescript
// gemini.service.ts - getContextualPrompt()

your_profession_type: {
  fr: `Prompt en français...`,
  en: `Prompt in English...`,
  es: `Prompt en español...`,
}
```

### Step 3: Test
```bash
curl -X POST http://localhost:3000/api/picture-test/analyze-and-generate \
  -d '{"imageBase64":"...","description":"your_profession","language":"en"}'
```

## Troubleshooting

### Issue: Wrong person generated
**Solution:** You're using Imagen instead of Gemini 2.5 Flash Image
```typescript
// ❌ Wrong
model: 'imagen-4.0-generate-001'

// ✅ Correct
model: 'gemini-2.5-flash-image'
```

### Issue: TypeScript errors
**Solution:** Methods are private, use public API
```typescript
// ❌ Wrong
this.geminiService.determinePromptStyle(...)

// ✅ Correct
await this.geminiService.generateProfessionalCVPicture(...)
```

### Issue: Low quality output
**Solution:** Check input image resolution
- Minimum: 512x512px
- Recommended: 1024x1024px or higher

### Issue: API timeout
**Solution:** Increase timeout, Gemini takes 5-10 seconds
```typescript
{ timeout: 30000 } // 30 seconds
```

## Cost Calculator

| Operation | Cost | Notes |
|-----------|------|-------|
| Image Analysis (OpenAI) | ~$0.01 | GPT-4o Vision |
| Image Generation (Gemini) | ~$0.04 | Gemini 2.5 Flash Image |
| **Total per photo** | **~$0.05** | Very affordable |

### Monthly Estimate
- 100 photos/month = $5
- 500 photos/month = $25
- 1000 photos/month = $50

## Common Use Cases

### 1. WhatsApp CV Bot
```typescript
// When user sends photo
if (messageType === 'image') {
  const analysis = await this.openaiService.analyzeCVPicture(...);

  if (!analysis.isSuitable) {
    const professional = await this.geminiService.generateProfessionalCVPicture(
      session.cvData.personalInfo.desiredPosition,
      language,
      imageData
    );

    await this.whatsappService.sendImage(phoneNumber, professional);
  }
}
```

### 2. Web Application
```typescript
// Upload endpoint
@Post('upload-photo')
async uploadPhoto(@Body() { image, jobTitle }) {
  const professional = await this.geminiService.generateProfessionalCVPicture(
    jobTitle,
    'en',
    image
  );

  return { professionalPhoto: professional };
}
```

### 3. Batch Processing
```typescript
// Process multiple photos
const results = await Promise.all(
  photos.map(photo =>
    this.geminiService.generateProfessionalCVPicture(
      photo.jobTitle,
      photo.language,
      photo.imageData
    )
  )
);
```

## Performance Tips

1. **Cache Results:** Hash images and cache generated photos
2. **Parallel Processing:** Use Promise.all for multiple photos
3. **Error Handling:** Always wrap in try-catch
4. **Retry Logic:** Implement exponential backoff for API failures
5. **Monitoring:** Log all operations for debugging

## File Locations

```
src/modules/
├── gemini/
│   ├── gemini.service.ts       ← Main service
│   └── gemini.module.ts
├── openai/
│   └── openai.service.ts       ← Image analysis
└── cv-generation/
    └── picture-test.controller.ts  ← Test endpoints

docs/
├── IMAGE_EDITING_MODULE.md         ← Full documentation
└── IMAGE_EDITING_QUICK_REFERENCE.md ← This file

public/
└── picture-test.html               ← Test interface
```

## Need Help?

- Full docs: `docs/IMAGE_EDITING_MODULE.md`
- Test interface: `http://localhost:3000`
- Logs: Check console for `[GeminiService]` and `[OpenAIService]`

---

**Quick Links:**
- [Full Documentation](./IMAGE_EDITING_MODULE.md)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs/image-generation)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
