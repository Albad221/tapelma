# Image Editing Module Documentation

## Overview

The Image Editing Module uses **Google Gemini 2.5 Flash Image (Nano Banana)** to transform casual photos into professional CV headshots while **preserving the person's identity**. This module supports contextual professional styles based on job/profession type.

## Architecture

### Core Components

```
src/modules/
├── gemini/
│   ├── gemini.service.ts          # Main image editing service
│   └── gemini.module.ts            # Module definition
├── openai/
│   └── openai.service.ts           # Image analysis with GPT-4o Vision
├── cv-generation/
│   ├── picture-test.controller.ts  # REST API endpoints for testing
│   └── conversation.service.ts     # WhatsApp integration
└── whatsapp/
    └── whatsapp.controller.ts      # WhatsApp webhook handler
```

### Technology Stack

- **Gemini 2.5 Flash Image**: Image editing (preserves identity)
- **OpenAI GPT-4o Vision**: Image analysis (suitability check)
- **@google/generative-ai**: Gemini SDK
- **NestJS**: Backend framework

## Key Features

### 1. Professional Image Analysis
Uses OpenAI GPT-4o Vision to analyze uploaded photos and determine suitability for professional CV use.

**Analysis Criteria:**
- Professional background
- Appropriate lighting
- Professional attire
- Image quality
- Facial expression

### 2. Contextual Image Editing
Automatically selects the appropriate professional headshot style based on job/profession:

| Profession Type | Style Characteristics |
|----------------|----------------------|
| **Executive/C-Suite** | Dramatic corporate office, floor-to-ceiling windows, navy blazer |
| **Legal Professional** | Traditional mahogany office, law books, formal black/gray suit |
| **Healthcare** | Modern medical office, white coat, warm clinical lighting |
| **Therapist/Counselor** | Peaceful therapy office, plants, soft comfortable lighting |
| **Creative/Artist** | Art studio, creative attire, moody dramatic lighting |
| **Content Creator** | Instagram-worthy location, trendy attire, social media optimized |
| **Real Estate** | Upscale property background, professional blazer, confident |
| **Entrepreneur** | Startup office, modern attire, visionary lighting |
| **Trades/Craftsman** | Clean workshop, work polo/shirt, natural authentic lighting |
| **General Professional** | Modern co-working space, plants, natural daylight (default) |

### 3. Identity Preservation
The system uses **image editing** (not generation) to ensure the same person appears in the professional photo. Only these elements change:
- Background
- Lighting
- Attire
- Framing

**Identity preserved:**
- Facial features
- Skin tone and texture
- Ethnicity
- Gender
- Distinctive characteristics

### 4. Multi-Language Support
All prompts available in:
- French (fr)
- Spanish (es)
- English (en)

## API Reference

### GeminiService

#### `generateProfessionalCVPicture(description, language, originalImageBase64)`

Transforms a casual photo into a professional CV headshot.

**Parameters:**
- `description` (string): Job title or profession (e.g., "menuisier", "CEO", "médecin")
- `language` (string): Language code ('fr', 'es', 'en'). Default: 'fr'
- `originalImageBase64` (string): Base64-encoded original image (REQUIRED)

**Returns:**
- Promise<string>: Base64-encoded professional headshot

**Example:**
```typescript
const professionalPhoto = await geminiService.generateProfessionalCVPicture(
  'Software Engineer',
  'en',
  originalImageBase64
);
```

#### `determinePromptStyle(description)` (private)

Analyzes job description and determines appropriate professional style.

**Returns:**
- string: One of: 'executive', 'legal', 'healthcare', 'therapist', 'creative', 'content_creator', 'real_estate', 'entrepreneur', 'trades', 'general'

#### `getContextualPrompt(style, description, language)` (private)

Retrieves the appropriate editing prompt based on style and language.

**Returns:**
- string: Detailed editing instructions for Gemini

### OpenAIService

#### `analyzeCVPicture(imageUrl, language)`

Analyzes photo suitability for professional CV use.

**Parameters:**
- `imageUrl` (string): Data URL or base64-encoded image
- `language` (string): Language code

**Returns:**
```typescript
{
  isSuitable: boolean,
  reason: string,
  suggestions: string[],
  personDescription?: string
}
```

## REST API Endpoints

### Testing Interface

#### POST `/api/picture-test/analyze`
Analyzes an image for CV suitability.

**Request Body:**
```json
{
  "imageBase64": "base64_encoded_image",
  "language": "fr"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "isSuitable": false,
    "reason": "Outdoor background not professional",
    "suggestions": ["Use neutral background", "Wear professional attire"]
  }
}
```

#### POST `/api/picture-test/generate`
Generates a professional CV picture from description only (without reference image).

**Request Body:**
```json
{
  "description": "Software Engineer",
  "language": "en"
}
```

#### POST `/api/picture-test/analyze-and-generate`
Complete flow: analyzes image and generates professional version if unsuitable.

**Request Body:**
```json
{
  "imageBase64": "base64_encoded_image",
  "description": "menuisier",
  "language": "fr"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "isSuitable": false,
    "reason": "...",
    "suggestions": [...]
  },
  "originalImage": "base64...",
  "generatedImage": "base64_professional_photo",
  "message": "Image analyzed and professional photo generated"
}
```

## WhatsApp Integration

### Conversation Flow

1. **User uploads photo via WhatsApp**
2. **System analyzes** photo with OpenAI Vision
3. **If unsuitable:** System automatically generates professional version using Gemini
4. **User receives** both analysis and professional photo (if generated)

### Implementation in ConversationService

The conversation service automatically handles image messages:

```typescript
// Image message received
if (messageType === 'image') {
  // Download image
  const imageData = await this.whatsappService.downloadMedia(mediaId);

  // Analyze with OpenAI
  const analysis = await this.openaiService.analyzeCVPicture(imageData, language);

  // If unsuitable, generate professional version
  if (!analysis.isSuitable) {
    const jobTitle = session.cvData.personalInfo?.desiredPosition || 'professional';
    const professionalPhoto = await this.geminiService.generateProfessionalCVPicture(
      jobTitle,
      language,
      imageData
    );

    // Send professional photo back to user
    await this.whatsappService.sendImage(phoneNumber, professionalPhoto);
  }
}
```

## Configuration

### Environment Variables

Required in `.env`:
```bash
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
```

### Module Setup

```typescript
// cv-generation.module.ts
@Module({
  imports: [
    GeminiModule,      // Image editing
    OpenAIModule,      // Image analysis
    WhatsAppModule,    // Messaging
  ],
  // ...
})
export class CVGenerationModule {}
```

## Prompt Engineering

### Prompt Structure

Each contextual prompt follows this structure:

1. **Identity Preservation Instruction** (CRITICAL)
   - Explicit instruction to keep the same person
   - Listed in both header and footer

2. **Transformation Instructions**
   - Lighting requirements
   - Posture/expression guidelines
   - Attire specifications
   - Background description
   - Quality enhancements

3. **Critical Constraints**
   - What MUST NOT change (identity, features, etc.)
   - What CAN change (lighting, background, attire)

### Example Prompt (Executive Style - English)

```
Transform this photo into a crisp, executive-level professional headshot suitable for C-suite LinkedIn profiles. IMPORTANT: Keep exactly the same person, the same face, the same identity.

Transformation instructions for CEO:
- The lighting should be dramatic yet professional with soft shadows
- My posture is confident and approachable, shoulders square to camera
- Wearing a dark navy blazer or elegant business suit
- The background is a modern corporate office with floor-to-ceiling windows, slightly blurred
- Expression: confident and professional, eyes making direct contact with camera
- Preserve natural skin texture while subtly enhancing sharpness

CRITICAL: Keep EXACTLY the same person. Only lighting, background, and attire change.
```

## Adding New Profession Types

To add a new profession category:

### 1. Update `determinePromptStyle()` in `gemini.service.ts`

```typescript
// Add detection pattern
if (desc.match(/new_profession|related_terms/i)) {
  return 'new_profession_type';
}
```

### 2. Add prompts in `getContextualPrompt()`

```typescript
new_profession_type: {
  fr: `Prompt in French...`,
  en: `Prompt in English...`,
  es: `Prompt in Spanish...`,
}
```

### 3. Test with job description

```bash
curl -X POST http://localhost:3000/api/picture-test/analyze-and-generate \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "...",
    "description": "new profession title",
    "language": "en"
  }'
```

## Testing

### Manual Testing

1. **Start test interface:**
```bash
npm run start:dev
# Open http://localhost:3000
```

2. **Upload test image**
3. **Enter job description** (e.g., "menuisier", "CEO", "doctor")
4. **Click "Analyze"**
5. **Review** analysis and generated professional photo

### Automated Testing

```typescript
// Example test
describe('GeminiService', () => {
  it('should generate professional headshot for carpenter', async () => {
    const result = await geminiService.generateProfessionalCVPicture(
      'menuisier',
      'fr',
      testImageBase64
    );

    expect(result).toBeDefined();
    expect(result).toMatch(/^[A-Za-z0-9+/=]+$/); // Valid base64
  });
});
```

## Cost Considerations

### Gemini 2.5 Flash Image Pricing
- **Cost:** $30.00 per 1 million output tokens
- **Each image:** ~1290 tokens
- **Price per image:** ~$0.039 (4 cents)

### OpenAI GPT-4o Vision Pricing
- **Input:** $2.50 per 1M tokens
- **Output:** $10.00 per 1M tokens
- **Average cost per analysis:** ~$0.01-0.02

### Total Cost Per Photo Transformation
- **Analysis + Generation:** ~$0.05 per photo
- Very cost-effective for professional CV photo generation

## Troubleshooting

### Common Issues

#### 1. Generated image shows different person
**Cause:** Using Imagen instead of Gemini 2.5 Flash Image
**Solution:** Ensure model is set to `gemini-2.5-flash-image` (not `imagen-4.0-generate-001`)

#### 2. TypeScript errors about missing methods
**Cause:** Methods are private
**Solution:** Access only through public `generateProfessionalCVPicture()` method

#### 3. Image quality issues
**Cause:** Input image too low resolution
**Solution:** Recommend minimum 512x512px input images

#### 4. Wrong professional style selected
**Cause:** Job description not matching patterns
**Solution:** Add more detection patterns in `determinePromptStyle()`

## Best Practices

### 1. Input Image Quality
- Minimum resolution: 512x512px
- Maximum size: 5MB
- Supported formats: JPG, PNG
- Face should be clearly visible

### 2. Job Description Accuracy
- Be specific: "Software Engineer" not just "Engineer"
- Include level if relevant: "Senior", "Junior", "Lead"
- Use common job titles for better pattern matching

### 3. Error Handling
- Always validate image before processing
- Provide fallback to original image if generation fails
- Log errors for debugging

### 4. Performance Optimization
- Cache generated images by hash
- Use appropriate timeouts (Gemini can take 5-10 seconds)
- Implement retry logic for API failures

## Future Enhancements

### Potential Improvements

1. **Custom Style Selection**
   - Allow users to choose preferred style manually
   - A/B testing different styles

2. **Batch Processing**
   - Generate multiple variations
   - Different professional contexts

3. **Advanced Customization**
   - Background color selection
   - Lighting intensity control
   - Attire color preferences

4. **Integration with Other Features**
   - LinkedIn profile photo optimization
   - Business card photo generation
   - Website headshot creation

## Support & Maintenance

### Logs
All operations are logged with context:
```
[GeminiService] Editing photo with Gemini 2.5 Flash Image (Nano Banana)...
[GeminiService] Job/profession context: menuisier
[GeminiService] Using prompt style: trades
[GeminiService] Professional CV picture edited successfully
```

### Monitoring
- Track API usage and costs
- Monitor success/failure rates
- Analyze which profession types are most used

## License & Attribution

This module uses:
- Google Gemini API (requires API key and billing)
- OpenAI API (requires API key and billing)

Make sure to comply with both services' terms of service and usage policies.

---

**Last Updated:** 2025-11-20
**Version:** 1.0.0
**Maintained by:** SamaCV Team
