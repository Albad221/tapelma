import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private imageGenAI: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    this.imageGenAI = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  /**
   * Determine the appropriate prompt style based on job description
   */
  private determinePromptStyle(description: string): string {
    const desc = description.toLowerCase();

    // Executive/Corporate
    if (desc.match(/ceo|cto|cfo|directeur|director|executive|président|president|c-suite|cadre sup/i)) {
      return 'executive';
    }

    // Legal
    if (desc.match(/avocat|lawyer|juriste|legal|notaire|magistrat/i)) {
      return 'legal';
    }

    // Healthcare
    if (desc.match(/médecin|doctor|infirmier|nurse|dentiste|pharmacien|healthcare|health|medical/i)) {
      return 'healthcare';
    }

    // Therapist/Counselor
    if (desc.match(/thérapeute|therapist|psychologue|psychologist|conseiller|counselor|coach/i)) {
      return 'therapist';
    }

    // Creative/Artist
    if (desc.match(/artiste|artist|designer|créatif|creative|photographe|photographer|illustrateur|illustrator/i)) {
      return 'creative';
    }

    // Content Creator/Influencer
    if (desc.match(/influenceur|influencer|créateur de contenu|content creator|youtuber|blogger/i)) {
      return 'content_creator';
    }

    // Real Estate
    if (desc.match(/immobilier|real estate|agent immobilier|realtor/i)) {
      return 'real_estate';
    }

    // Entrepreneur/Startup
    if (desc.match(/entrepreneur|startup|fondateur|founder|innovateur|innovator/i)) {
      return 'entrepreneur';
    }

    // Trades/Crafts (Menuisier, plombier, etc.)
    if (desc.match(/menuisier|plombier|électricien|carpenter|plumber|electrician|artisan|craftsman|ouvrier|worker|technicien|technician/i)) {
      return 'trades';
    }

    // Default: General professional/job hunter
    return 'general';
  }

  /**
   * Get contextual prompt based on profession type
   * All prompts follow these UNIVERSAL rules:
   * - Neutral background (white, beige, light gray)
   * - Natural/frontal lighting, well-lit face, no harsh shadows
   * - Clean, simple, professional attire (industry-appropriate)
   * - Face camera, calm expression, slight confidence
   * - Head + shoulders frame
   * - Good quality, natural look (no heavy retouching)
   *
   * Avoid: busy backgrounds, selfies, weird angles, sunglasses, caps, casual clothes, cropped group photos, backlight
   */
  private getContextualPrompt(style: string, description: string, language: string): string {
    // Base rules that apply to ALL professions
    const baseRules = {
      fr: `RÈGLES OBLIGATOIRES POUR TOUTES LES PHOTOS CV:

À FAIRE:
- Fond NEUTRE et CLAIR (blanc, beige, gris très léger)
- Lumière NATURELLE ou FRONTALE, visage bien éclairé, sans ombres dures ni contre-jour
- Regarder LA CAMÉRA directement, expression calme et légèrement confiante
- Cadrage TÊTE + ÉPAULES uniquement
- Photo de bonne QUALITÉ, look NATUREL, pas trop retouchée

À ÉVITER ABSOLUMENT:
- Fonds chargés (mur coloré, cuisine, salon, voiture)
- Selfies, angles bizarres, duckface
- Lunettes de soleil, casquettes, chapeaux
- Vêtements décontractés ou de fête
- Retouche excessive
- Photos de groupe recadrées
- Contre-jour ou ombres dures

RÉSUMÉ: Fond neutre, lumière propre, face caméra, naturel, pro.`,

      en: `MANDATORY RULES FOR ALL CV PHOTOS:

DO:
- NEUTRAL and CLEAR background (white, beige, very light gray)
- NATURAL or FRONTAL lighting, well-lit face, no harsh shadows or backlight
- Look directly at CAMERA, calm and slightly confident expression
- HEAD + SHOULDERS framing only
- Good QUALITY photo, NATURAL look, not over-edited

AVOID ABSOLUTELY:
- Busy backgrounds (colored wall, kitchen, living room, car)
- Selfies, weird angles, duckface
- Sunglasses, caps, hats
- Casual or party clothes
- Excessive retouching
- Cropped group photos
- Backlight or harsh shadows

SUMMARY: Neutral background, clean lighting, face camera, natural, professional.`,
    };

    // Industry-specific attire recommendations
    const attireByStyle = {
      executive: {
        fr: `TENUE SPÉCIFIQUE (${description}): Costume élégant bleu marine/gris foncé ou blazer professionnel. Style cadre supérieur.`,
        en: `SPECIFIC ATTIRE (${description}): Elegant navy/dark gray suit or professional blazer. Executive style.`,
      },
      legal: {
        fr: `TENUE SPÉCIFIQUE (${description}): Costume formel noir ou gris foncé. Style avocat/juridique classique et autoritaire.`,
        en: `SPECIFIC ATTIRE (${description}): Formal black or dark gray suit. Classic, authoritative legal style.`,
      },
      healthcare: {
        fr: `TENUE SPÉCIFIQUE (${description}): Blouse blanche ou tenue médicale professionnelle propre. Style soignant digne de confiance.`,
        en: `SPECIFIC ATTIRE (${description}): White coat or clean professional medical attire. Trustworthy healthcare style.`,
      },
      therapist: {
        fr: `TENUE SPÉCIFIQUE (${description}): Tenue professionnelle décontractée mais soignée (pull, chemise douce). Style chaleureux et accessible.`,
        en: `SPECIFIC ATTIRE (${description}): Smart casual professional attire (sweater, soft shirt). Warm and approachable style.`,
      },
      creative: {
        fr: `TENUE SPÉCIFIQUE (${description}): Tenue stylée et créative mais professionnelle. Style artistique personnel.`,
        en: `SPECIFIC ATTIRE (${description}): Stylish and creative but professional attire. Personal artistic style.`,
      },
      content_creator: {
        fr: `TENUE SPÉCIFIQUE (${description}): Tenue moderne et tendance qui reflète votre marque personnelle. Style influenceur professionnel.`,
        en: `SPECIFIC ATTIRE (${description}): Modern, trendy attire reflecting your personal brand. Professional influencer style.`,
      },
      real_estate: {
        fr: `TENUE SPÉCIFIQUE (${description}): Costume ou blazer élégant. Style agent immobilier réussi et digne de confiance.`,
        en: `SPECIFIC ATTIRE (${description}): Elegant suit or blazer. Successful, trustworthy real estate agent style.`,
      },
      entrepreneur: {
        fr: `TENUE SPÉCIFIQUE (${description}): Tenue moderne et professionnelle (blazer, chemise élégante). Style entrepreneur innovant.`,
        en: `SPECIFIC ATTIRE (${description}): Modern professional attire (blazer, elegant shirt). Innovative entrepreneur style.`,
      },
      trades: {
        fr: `TENUE SPÉCIFIQUE (${description}): Tenue de travail professionnelle propre (polo, chemise de travail) ou chemise décontractée professionnelle. Style artisan compétent.`,
        en: `SPECIFIC ATTIRE (${description}): Clean professional work attire (polo, work shirt) or professional casual shirt. Skilled tradesperson style.`,
      },
      general: {
        fr: `TENUE SPÉCIFIQUE (${description}): Blazer ou chemise élégante en couleur neutre (bleu marine, gris, noir). Style professionnel LinkedIn.`,
        en: `SPECIFIC ATTIRE (${description}): Blazer or elegant shirt in neutral color (navy, gray, black). LinkedIn professional style.`,
      },
    };

    const attire = attireByStyle[style] || attireByStyle.general;
    const base = baseRules[language] || baseRules['en'];
    const attireText = attire[language] || attire['en'];

    const criticalNote = language === 'fr'
      ? `\n\nCRITIQUE: Gardez EXACTEMENT la même personne. Préservez tous les traits du visage, l'identité, l'ethnicité. Ne changez que le fond, l'éclairage, et la tenue si nécessaire.`
      : `\n\nCRITICAL: Keep EXACTLY the same person. Preserve all facial features, identity, ethnicity. Only change background, lighting, and attire if needed.`;

    return `${base}\n\n${attireText}${criticalNote}`;
  }

  /**
   * Generate a professional CV picture using Gemini 2.5 Flash Image (Nano Banana)
   * This uses IMAGE EDITING to transform the original photo into a professional CV photo
   * while preserving the person's identity
   * @param description - Description of the person (job title, style preference, etc.)
   * @param language - Language for the prompt
   * @param originalImageBase64 - Original image to edit (REQUIRED for editing)
   * @returns Base64 encoded image data
   */
  async generateProfessionalCVPicture(
    description: string,
    language: string = 'fr',
    originalImageBase64?: string,
  ): Promise<string> {
    try {
      if (!originalImageBase64) {
        throw new Error('Original image is required for professional CV picture generation');
      }

      this.logger.log('Editing photo with Gemini 3 Pro Image Preview...');
      this.logger.log(`Job/profession context: ${description}`);

      // Determine professional context based on job description
      const promptStyle = this.determinePromptStyle(description);
      this.logger.log(`Using prompt style: ${promptStyle}`);

      // Get contextual prompt based on profession
      const editingPrompt = this.getContextualPrompt(promptStyle, description, language);

      // Prepare image data
      const imageData = originalImageBase64.startsWith('data:')
        ? originalImageBase64.split(',')[1]
        : originalImageBase64;

      // Use the new @google/genai SDK with responseModalities for image generation
      const response = await this.imageGenAI.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { text: editingPrompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageData,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      // Extract the generated image from the response
      const parts = response.candidates?.[0]?.content?.parts;

      if (!parts || parts.length === 0) {
        throw new Error('No image parts in response');
      }

      // Find the image part
      let generatedImageBase64: string | null = null;
      for (const part of parts) {
        if (part.inlineData?.data) {
          generatedImageBase64 = part.inlineData.data;
          this.logger.log('Found generated image in response');
          break;
        }
        if (part.text) {
          this.logger.log(`Gemini text response: ${part.text.substring(0, 100)}...`);
        }
      }

      if (!generatedImageBase64) {
        throw new Error('No image data found in response - model may not support image output');
      }

      this.logger.log('Professional CV picture edited successfully with Gemini 3 Pro Image');
      return generatedImageBase64;

    } catch (error) {
      this.logger.error(`Error editing professional CV picture: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze a CV picture to determine if it's suitable for professional use
   * This uses Gemini Vision to evaluate the image quality and appropriateness
   * @param imageBase64 - Base64 encoded image data
   * @param language - Language for the response
   * @returns Analysis result with suitability and reason
   */
  async analyzeCVPicture(
    imageBase64: string,
    language: string = 'fr',
  ): Promise<{ isSuitable: boolean; reason: string }> {
    try {
      this.logger.log('Analyzing CV picture with Gemini Vision...');

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = language === 'fr'
        ? `Analysez cette photo pour déterminer si elle convient comme photo de CV professionnel.

Critères d'évaluation:
1. Visage clairement visible et bien éclairé
2. Expression professionnelle et appropriée
3. Arrière-plan non distrayant
4. Qualité d'image suffisante (pas floue)
5. Posture appropriée (pas de main sur le visage, pas de pose décontractée)
6. Tenue vestimentaire acceptable (pas de vêtements inappropriés)

Répondez en JSON avec ce format exact:
{
  "isSuitable": true/false,
  "reason": "Explication en français (2-3 phrases maximum)"
}

Si la photo n'est PAS adaptée, expliquez pourquoi de manière constructive.
Si la photo EST adaptée, mentionnez ses points forts.`
        : `Analyze this photo to determine if it's suitable as a professional CV photo.

Evaluation criteria:
1. Face clearly visible and well-lit
2. Professional and appropriate expression
3. Non-distracting background
4. Sufficient image quality (not blurry)
5. Appropriate posture (no hand on face, no casual poses)
6. Acceptable attire (no inappropriate clothing)

Respond in JSON with this exact format:
{
  "isSuitable": true/false,
  "reason": "Explanation in English (2-3 sentences maximum)"
}

If the photo is NOT suitable, explain why constructively.
If the photo IS suitable, mention its strengths.`;

      // Prepare image data
      const imageData = imageBase64.startsWith('data:')
        ? imageBase64.split(',')[1]
        : imageBase64;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData,
          },
        },
      ]);

      const response = await result.response;
      const responseText = response.text();

      this.logger.log(`Gemini Vision response: ${responseText}`);

      // Parse JSON response
      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        } else {
          // Try to find JSON object directly
          const directJsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (directJsonMatch) {
            jsonStr = directJsonMatch[0];
          }
        }

        const analysis = JSON.parse(jsonStr);
        return {
          isSuitable: analysis.isSuitable === true,
          reason: analysis.reason || (language === 'fr' ? 'Analyse complète.' : 'Analysis complete.'),
        };
      } catch (parseError) {
        this.logger.warn(`Failed to parse Gemini response as JSON: ${parseError.message}`);
        // Default to suitable if we can't parse
        return {
          isSuitable: true,
          reason: language === 'fr'
            ? 'Photo acceptée pour le CV.'
            : 'Photo accepted for CV.',
        };
      }
    } catch (error) {
      this.logger.error(`Error analyzing CV picture with Gemini: ${error.message}`);
      // On error, default to suitable to not block the user
      return {
        isSuitable: true,
        reason: language === 'fr'
          ? 'Photo acceptée (analyse automatique indisponible).'
          : 'Photo accepted (automatic analysis unavailable).',
      };
    }
  }

  /**
   * Alternative: Generate using text-to-image prompts
   * This is a fallback method that generates descriptive prompts
   */
  async generateCVPicturePrompt(
    jobTitle: string,
    gender: string = 'neutral',
    ethnicity: string = 'diverse',
    language: string = 'fr',
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

    const promptRequest = language === 'fr'
      ? `Génère une description détaillée pour créer une photo CV professionnelle pour un CV de ${jobTitle}.
         Genre: ${gender}, Ethnicité: ${ethnicity}.
         La description doit être en anglais et adaptée pour un générateur d'images IA.
         Inclure: apparence professionnelle, fond, éclairage, cadrage, expression, vêtements.`
      : `Generate a detailed description to create a professional CV picture for a ${jobTitle}.
         Gender: ${gender}, Ethnicity: ${ethnicity}.
         Description should be in English and suitable for an AI image generator.
         Include: professional appearance, background, lighting, framing, expression, clothing.`;

    const result = await model.generateContent(promptRequest);
    const response = await result.response;
    return response.text();
  }
}
