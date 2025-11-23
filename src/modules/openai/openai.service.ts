import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  CVData,
  WorkExperience,
  PersonalInfo,
} from '../../common/interfaces/cv-data.interface';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private adminService: AdminService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.openai = new OpenAI({ apiKey });
  }

  async optimizeWorkExperience(
    workExp: WorkExperience,
    targetLanguage: string = 'en',
  ): Promise<string> {
    try {
      const prompt = `You are a professional CV writer. Optimize the following work experience description to be more impactful and professional.

Company: ${workExp.companyName}
Position: ${workExp.position}
Original Description: ${workExp.description}

Language: ${targetLanguage}

CRITICAL REQUIREMENTS:
1. Generate EXACTLY 3-5 bullet points (NO MORE than 5)
2. Each bullet point must be ONE concise line (maximum 15-20 words)
3. Start each bullet with a strong action verb
4. NEVER invent or add information that wasn't in the original description
5. NEVER add fake metrics, numbers, or details
6. Only improve the wording and structure of what the user actually said
7. If the original description is vague or short, keep it simple - DO NOT fabricate details

Return ONLY the bullet points in ${targetLanguage}, formatted as a list with "- " prefix. No explanations, no additional text.`;


      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert CV writer. You MUST NEVER invent or fabricate information. Only improve the wording of what the user actually provided. Accuracy and truthfulness are more important than impressive-sounding content.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: parseFloat(
          this.configService.get<string>('OPENAI_TEMPERATURE') || '0.3',
        ),
      });

      return completion.choices[0].message.content?.trim() || '';
    } catch (error) {
      this.logger.error(
        `Error optimizing work experience: ${error.message}`,
      );
      return workExp.description; // Return original if optimization fails
    }
  }

  async generateProfessionalSummary(
    cvData: CVData,
    targetLanguage: string = 'en',
  ): Promise<string> {
    try {
      const recentExperience = cvData.workExperiences?.[0];
      const education = cvData.education?.[0];
      const topSkills = cvData.skills?.slice(0, 5).map((s) => s.name) || [];

      const prompt = `Create a compelling professional summary for a CV based on the following information:

Current/Recent Position: ${recentExperience?.position || 'N/A'} at ${recentExperience?.companyName || 'N/A'}
Education: ${education?.degree || 'N/A'} in ${education?.fieldOfStudy || 'N/A'}
Top Skills: ${topSkills.join(', ') || 'N/A'}
Years of Experience: ${cvData.workExperiences?.length || 0}

Language: ${targetLanguage}

Create a professional summary in ${targetLanguage} that:
1. Is 3-4 sentences long
2. Highlights key expertise and achievements
3. Demonstrates value proposition
4. Uses industry-relevant keywords
5. Is written in third person

Return ONLY the professional summary without any title or explanation.`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert CV writer who creates compelling professional summaries.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: parseFloat(
          this.configService.get<string>('OPENAI_TEMPERATURE') || '0.7',
        ),
      });

      return completion.choices[0].message.content?.trim() || '';
    } catch (error) {
      this.logger.error(`Error generating summary: ${error.message}`);
      throw error;
    }
  }

  async analyzeATSCompatibility(cvData: CVData): Promise<{
    score: number;
    suggestions: string[];
    keywords: string[];
  }> {
    try {
      const cvText = JSON.stringify(cvData, null, 2);

      const prompt = `Analyze the following CV data for ATS (Applicant Tracking System) compatibility and provide a score out of 100, along with specific suggestions for improvement.

CV Data:
${cvText}

Provide your analysis in the following JSON format:
{
  "score": <number between 0-100>,
  "suggestions": [<array of specific suggestions>],
  "keywords": [<array of important industry keywords found or missing>]
}

Consider:
1. Use of relevant keywords
2. Clear formatting structure
3. Quantifiable achievements
4. Action verbs usage
5. Appropriate length and detail
6. Industry-standard section names

Return ONLY the JSON object, no additional text.`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an ATS expert who analyzes CVs for applicant tracking system compatibility.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return result;
    } catch (error) {
      this.logger.error(`Error analyzing ATS compatibility: ${error.message}`);
      return {
        score: 70,
        suggestions: ['Unable to perform detailed analysis'],
        keywords: [],
      };
    }
  }

  async generateCoverLetter(
    cvData: CVData,
    jobTitle: string,
    companyName: string,
    jobDescription?: string,
    targetLanguage: string = 'en',
  ): Promise<string> {
    try {
      const prompt = `Generate a professional cover letter based on the following information:

Applicant's CV Data:
${JSON.stringify(cvData.personalInfo, null, 2)}

Recent Experience:
${JSON.stringify(cvData.workExperiences[0], null, 2)}

Target Position: ${jobTitle}
Company: ${companyName}
Job Description: ${jobDescription || 'Not provided'}

Language: ${targetLanguage}

Create a cover letter in ${targetLanguage} that:
1. Is professional and engaging
2. Highlights relevant experience and skills
3. Shows enthusiasm for the position
4. Demonstrates knowledge of the company
5. Is 3-4 paragraphs long
6. Includes proper greeting and closing

Return the complete cover letter.`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert career counselor who writes compelling cover letters.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: parseFloat(
          this.configService.get<string>('OPENAI_TEMPERATURE') || '0.7',
        ),
      });

      return completion.choices[0].message.content?.trim() || '';
    } catch (error) {
      this.logger.error(`Error generating cover letter: ${error.message}`);
      throw error;
    }
  }

  async extractStructuredInfo(
    message: string,
    context: string,
  ): Promise<any> {
    try {
      let contextInstructions = '';

      if (context === 'personal_info') {
        contextInstructions = `Extract personal information from the message. Look for:
- firstName: First name (extract from full name if provided)
- lastName: Last name (extract from full name if provided)
- email: Email address
- phone: Phone number
- city: City name
- country: Country name
- address: Full address

Common patterns to recognize:
- "je m'appelle NAME" or "jsuis NAME" or "my name is NAME" → extract firstName and lastName
- "NAME, EMAIL, PHONE, CITY, COUNTRY" → extract all fields
- If only a name is provided, split into firstName and lastName

Return a JSON object with these fields. Use null for missing fields.`;
      } else if (context === 'work_experience') {
        contextInstructions = `Extract work experience information:
- companyName: Company name
- position: Job title/position
- location: Work location
- startDate: Start date
- endDate: End date (or null if current)
- isCurrent: true if still working there
- description: Job description/responsibilities`;
      } else if (context === 'education') {
        contextInstructions = `Extract education information:
- institution: School/University name
- degree: Degree type (Bachelor's, Master's, etc.)
- fieldOfStudy: Field of study/major
- location: Location
- startDate: Start date
- endDate: End date (or null if current)
- isCurrent: true if still studying
- gpa: GPA if mentioned`;
      } else if (context === 'skills') {
        contextInstructions = `Extract skills from the message. Return an array of skill objects:
{ "skills": [{ "name": "skill name", "category": "technical/soft/language" }] }`;
      }

      const prompt = `${contextInstructions}

User Message: "${message}"

Extract the information and return ONLY a valid JSON object. Be intelligent about parsing names, dates, and other information from natural language.`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an intelligent data extraction assistant. You understand natural language in multiple languages (English, French, Spanish) and extract structured data accurately. You are smart about parsing names, splitting full names into first and last names, and understanding informal language.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      this.logger.log(`Extracted data for ${context}: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error extracting structured info: ${error.message}`);
      return {};
    }
  }

  async translateContent(
    content: string,
    targetLanguage: string,
  ): Promise<string> {
    try {
      const prompt = `Translate the following content to ${targetLanguage} while maintaining professional tone and context:

${content}

Return ONLY the translated text.`;

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional translator specializing in career documents.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });

      return completion.choices[0].message.content?.trim() || '';
    } catch (error) {
      this.logger.error(`Error translating content: ${error.message}`);
      return content;
    }
  }

  async handleConversation(
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    currentData: any,
    currentStep: string,
    language: string,
  ): Promise<{
    response: string;
    extractedData: any;
    nextStep: string;
    shouldContinue: boolean;
  }> {
    try {
      // Get admin configuration
      const mandatoryFields = this.adminService.getMandatoryFields();
      const fieldsWithContentProposal = this.adminService.getFieldsWithContentProposal();
      const activeTemplates = this.adminService.getActiveTemplates();
      const templateList = activeTemplates.map(t => `${t.templateId} (${t.category})`).join(', ');

      // Determine what sections are already filled
      const hasPersonalInfo = currentData.personalInfo?.firstName && currentData.personalInfo?.email;
      const hasWorkExperience = currentData.workExperiences && currentData.workExperiences.length > 0;
      const hasEducation = currentData.education && currentData.education.length > 0;
      const hasSkills = currentData.skills && currentData.skills.length > 0;
      const hasLanguages = currentData.languages && currentData.languages.length > 0;
      const hasProfessionalSummary = !!currentData.professionalSummary;

      const filledSections: string[] = [];
      if (hasPersonalInfo) filledSections.push('personalInfo');
      if (hasWorkExperience) filledSections.push('workExperience');
      if (hasEducation) filledSections.push('education');
      if (hasSkills) filledSections.push('skills');
      if (hasLanguages) filledSections.push('languages');
      if (hasProfessionalSummary) filledSections.push('professionalSummary');

      // Build list of individual fields we already have (even if section not complete)
      const collectedFields: string[] = [];
      if (currentData.personalInfo?.firstName) collectedFields.push(`name: ${currentData.personalInfo.firstName} ${currentData.personalInfo.lastName || ''}`);
      if (currentData.personalInfo?.email) collectedFields.push(`email: ${currentData.personalInfo.email}`);
      if (currentData.personalInfo?.phone) collectedFields.push(`phone: ${currentData.personalInfo.phone}`);
      if (currentData.personalInfo?.city) collectedFields.push(`city: ${currentData.personalInfo.city}`);
      if (currentData.personalInfo?.country) collectedFields.push(`country: ${currentData.personalInfo.country}`);

      const systemPrompt = `You are a CV generation assistant helping users create professional CVs through conversation.

🔴 CRITICAL - UNDERSTANDING INFORMAL MESSAGES:
Users often write in informal French with spelling mistakes, abbreviations, and mixed local languages (Wolof).
Examples to understand:
- "oui j'ai fait électricien pour la quincaillerie INGCO 2015 juska 2020" = User is providing work experience (electrician at INGCO hardware store from 2015 to 2020)
- "juska" = "jusqu'à" (until)
- "kils" = "qu'ils" (that they)
- "laba" = "là-bas" (there)
When user provides DETAILS (company names, dates, job descriptions), ALWAYS extract this as valid data - DO NOT ask for the same information again!

LANGUAGE: ${language === 'fr' ? 'French' : language === 'es' ? 'Spanish' : 'English'} (ALWAYS respond in this language)
CURRENT STEP: ${currentStep}

══════════════════════════════════════════════════════════════
🔴🔴🔴 ALREADY SAVED DATA - NEVER ASK FOR THIS AGAIN! 🔴🔴🔴
══════════════════════════════════════════════════════════════
${collectedFields.length > 0 ? collectedFields.map(f => `✅ ${f}`).join('\n') : 'None saved yet'}

THE DATA ABOVE IS ALREADY IN THE DATABASE. DO NOT ASK FOR IT AGAIN!
If user just provided their email, acknowledge it and ask for the NEXT missing field (phone).
══════════════════════════════════════════════════════════════

ALREADY FILLED SECTIONS: ${filledSections.join(', ') || 'None'}
MANDATORY FIELDS: ${mandatoryFields.join(', ')}
FIELDS WITH CONTENT PROPOSAL: ${fieldsWithContentProposal.join(', ')}
AVAILABLE TEMPLATES: ${templateList}

CURRENT CV DATA:
${JSON.stringify(currentData, null, 2)}

═══════════════════════════════════════════════════════════════
FLOW - FOLLOW THIS EXACTLY:
═══════════════════════════════════════════════════════════════

1. **personal_info** → Get name, email, phone → nextStep: "work_experience"
2. **work_experience** → Get job history OR skip if NOT mandatory → nextStep: "education"
3. **education** → Get education OR skip if NOT mandatory → nextStep: "skills"
4. **skills** → Get skills OR skip if NOT mandatory → nextStep: "languages_known"
5. **languages_known** → Get languages OR skip if NOT mandatory → nextStep: "professional_summary"
6. **professional_summary** → GENERATE and show summary, ask if OK → nextStep: "cv_picture"
7. **cv_picture** → Ask for photo, user uploads or says "non/no" → nextStep: "template_selection"
8. **template_selection** → User selects template → nextStep: "completed", shouldContinue: FALSE

═══════════════════════════════════════════════════════════════
🔴 MANDATORY vs OPTIONAL - CHECK THE LIST ABOVE!
═══════════════════════════════════════════════════════════════

MANDATORY FIELDS (from admin config): ${mandatoryFields.join(', ') || 'None'}

🔴 CRITICAL RULES:
1. ONLY the fields listed in "MANDATORY FIELDS" above are required
2. ALL OTHER FIELDS ARE OPTIONAL - user can skip them!
3. When user provides data (even informally), ALWAYS extract and save it

**personalInfo is ALWAYS mandatory:**
- User MUST provide: firstName, email, phone
- If user says "pas de mail" → INSIST: "Une adresse email est OBLIGATOIRE pour créer votre CV."
- DO NOT move to work_experience until you have firstName, email, and phone
- 🔴 IMPORTANT: Check "ALREADY SAVED DATA" section above! If name is already saved, DO NOT ask for it again!
- When user provides email after being asked, say "Merci, [NAME]! Quelle est votre numéro de téléphone?"
- NEVER re-ask for data that's already in the ALREADY SAVED section!

**For OPTIONAL fields (NOT in mandatory list):**
- If user says "non/no/skip/aucun/pas de" → ACCEPT and move to next step
- NEVER insist on optional fields!
- Example: If workExperience is NOT in mandatory list, user can skip it

**HANDLING USER DATA:**
- When user provides details (company names, job titles, dates, descriptions), EXTRACT IT
- Even informal messages contain data: "j'ai fait électricien pour INGCO 2015 juska 2020" = work experience
- NEVER say "OBLIGATOIRE" for fields that are NOT in the mandatory list!

**STEP PROGRESSION (for non-mandatory fields):**
- work_experience: If user says "non" → nextStep: "education"
- education: If user says "non" → nextStep: "skills"
- skills: If user says "non" → nextStep: "languages_known"
- languages_known: If user says "non" → nextStep: "professional_summary"
- cv_picture: If user says "non" → nextStep: "template_selection"

═══════════════════════════════════════════════════════════════
🟢 CONTENT PROPOSAL - FOR FIELDS IN "FIELDS WITH CONTENT PROPOSAL":
═══════════════════════════════════════════════════════════════

**workExperience (if in FIELDS WITH CONTENT PROPOSAL):**
- After user provides their job description, GENERATE an improved/optimized version
- Show the optimized description to the user and ask:
  "Voici une version optimisée de votre description. Voulez-vous l'utiliser ?"
- If user says yes → Use the optimized version
- If user says no → Keep their original description
- ALWAYS propose improvements for job descriptions

**skills (if in FIELDS WITH CONTENT PROPOSAL):**
- After getting work experience, PROPOSE relevant skills based on their job
- Example: "Basé sur votre expérience en [job], je vous propose ces compétences: [list]. Voulez-vous les ajouter ou préférez-vous lister vos propres compétences ?"
- If user says "oui" → Add the proposed skills and move to languages_known
- If user says "non" and skills is NOT mandatory → SKIP skills entirely, move to languages_known
- User can also provide their own skills instead

**professionalSummary (if in FIELDS WITH CONTENT PROPOSAL):**
- At professional_summary step, GENERATE a 2-3 sentence professional summary
- Show it to the user and ask: "Voici un résumé professionnel basé sur vos informations. Voulez-vous l'inclure ?"
- If user says yes → Extract to extractedData.professionalSummary
- If user says no → Skip or let them write their own

═══════════════════════════════════════════════════════════════
OTHER RULES:
═══════════════════════════════════════════════════════════════

**🔴 CRITICAL - NEVER ASK FOR ALREADY COLLECTED DATA:**
- Check "ALREADY COLLECTED FIELDS" above - these fields are ALREADY SAVED
- If "name:" is in ALREADY COLLECTED FIELDS → DO NOT ask for name again
- If "email:" is in ALREADY COLLECTED FIELDS → DO NOT ask for email again
- If "phone:" is in ALREADY COLLECTED FIELDS → DO NOT ask for phone again
- Check "CURRENT CV DATA" - all data shown there is already saved
- Only ask for MISSING fields that are not yet in CURRENT CV DATA

**NEVER ASK FOR ALREADY FILLED SECTIONS:**
- Check "ALREADY FILLED SECTIONS" above
- If a section is listed there, DO NOT ask for it again

**AT template_selection STEP:**
- Present template options
- When user selects one → Extract to extractedData.selectedTemplate
- Set shouldContinue: FALSE and nextStep: "completed"

═══════════════════════════════════════════════════════════════
RESPONSE FORMAT (JSON):
═══════════════════════════════════════════════════════════════
{
  "response": "Your message to user in ${language === 'fr' ? 'French' : language === 'es' ? 'Spanish' : 'English'}",
  "extractedData": { ... any new data extracted ... },
  "nextStep": "one of: personal_info, work_experience, education, skills, languages_known, professional_summary, cv_picture, template_selection, completed",
  "shouldContinue": true (or false ONLY at template_selection when user selects a template)
}`;

      // Limit conversation history to last 5 messages to reduce token usage
      const limitedHistory = conversationHistory.slice(-5);
      const limitedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...limitedHistory,
        { role: 'user', content: userMessage },
      ];

      // Use gpt-4o-mini by default - 60x cheaper than gpt-4-turbo
      // Override with OPENAI_MODEL env var if needed
      const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';

      const completion = await this.openai.chat.completions.create(
        {
          model,
          messages: limitedMessages,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          max_tokens: 800, // Reduced from 2000 - CV responses don't need that much
        },
        {
          timeout: 60000, // 60 second timeout
        }
      );

      const rawContent = completion.choices[0].message.content || '{}';
      this.logger.log(`Raw OpenAI response: ${rawContent.substring(0, 500)}...`);

      let result;
      try {
        result = JSON.parse(rawContent);
      } catch (parseError) {
        this.logger.error(`Failed to parse JSON response: ${rawContent}`);
        throw new Error(`Invalid JSON response from OpenAI: ${parseError.message}`);
      }

      // Validate and sanitize the response to prevent template text leakage
      if (result.response) {
        const templateLeakPatterns = [
          'Your conversational response to the user',
          'Your response in',
          '${language',
          'MUST be lowercase',
          'extractedData',
          'nextStep',
          'shouldContinue',
        ];

        for (const pattern of templateLeakPatterns) {
          if (result.response.includes(pattern)) {
            this.logger.warn(`Template text leaked in response: ${result.response.substring(0, 100)}`);
            // Return a generic response instead
            result.response = language === 'fr'
              ? 'Je comprends. Pouvez-vous me donner plus de détails ?'
              : language === 'es'
              ? 'Entiendo. ¿Puede darme más detalles?'
              : 'I understand. Can you give me more details?';
            break;
          }
        }
      }

      this.logger.log(`AI Response: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in conversation handling: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      return {
        response: language === 'fr'
          ? 'Désolé, une erreur s\'est produite. Pouvez-vous répéter?'
          : language === 'es'
          ? 'Lo siento, ocurrió un error. ¿Puedes repetir?'
          : 'Sorry, an error occurred. Can you please repeat?',
        extractedData: {},
        nextStep: currentStep,
        shouldContinue: true,
      };
    }
  }

  /**
   * Analyze if an image is suitable for a professional CV
   * @param imageUrl - URL or base64 data URL of the image
   * @param language - Language for the response
   * @returns Analysis result with suitability and feedback
   */
  /**
   * Convert an image of a template design into HTML/CSS code
   * @param imageBase64 - Base64 encoded image data
   * @returns Generated HTML template code
   */
  async convertImageToTemplate(
    imageBase64: string,
  ): Promise<{
    success: boolean;
    templateHtml: string;
    templateCss: string;
    description: string;
    suggestedName: string;
    suggestedCategory: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
  }> {
    try {
      this.logger.log('Converting image to template with OpenAI Vision...');

      const messages: any[] = [
        {
          role: 'system',
          content: `You are an expert frontend developer specializing in converting design images into pixel-perfect HTML/CSS templates.

Your task is to analyze a template design image and generate complete, working HTML/CSS code that replicates the design.

IMPORTANT GUIDELINES:
1. Generate a COMPLETE, self-contained HTML document with embedded CSS
2. Use Handlebars syntax for dynamic data:
   - {{personalInfo.fullName}}, {{personalInfo.email}}, {{personalInfo.phone}}, {{personalInfo.location}}
   - {{professionalSummary}}
   - {{#each workExperiences}}...{{/each}} with {{this.position}}, {{this.companyName}}, {{this.duration}}, {{this.description}}
   - {{#each education}}...{{/each}} with {{this.degreeField}}, {{this.institution}}, {{this.duration}}
   - {{#each skills}}...{{/each}} with {{this.name}}
   - {{#if hasWorkExperience}}, {{#if hasEducation}}, {{#if hasSkills}}, {{#if hasProfessionalSummary}}
   - {{primaryColor}}, {{secondaryColor}} for theme colors
3. Make the template responsive and print-friendly
4. Use modern CSS (flexbox, grid, CSS variables)
5. Match colors, fonts, and layout as closely as possible to the image
6. Ensure the template works for A4 page size (210mm x 297mm)

Return a JSON response with:
{
  "success": true,
  "templateHtml": "Complete HTML document with embedded styles",
  "templateCss": "Additional CSS if needed (can be empty)",
  "description": "Brief description of the template style",
  "suggestedName": "A name for this template",
  "suggestedCategory": "modern|traditional|creative|executive|minimal",
  "colors": {
    "primary": "#hexcolor",
    "secondary": "#hexcolor",
    "accent": "#hexcolor"
  }
}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this template design image and convert it into a complete, working HTML/CSS template for a CV/Resume. Include all sections visible in the design and use Handlebars syntax for dynamic content.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`,
              },
            },
          ],
        },
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      this.logger.log(`Template conversion result: ${result.suggestedName}`);

      return {
        success: result.success !== false,
        templateHtml: result.templateHtml || '',
        templateCss: result.templateCss || '',
        description: result.description || 'Generated from image',
        suggestedName: result.suggestedName || 'Custom Template',
        suggestedCategory: result.suggestedCategory || 'modern',
        colors: result.colors || {
          primary: '#667eea',
          secondary: '#764ba2',
          accent: '#4299e1',
        },
      };
    } catch (error) {
      this.logger.error(`Error converting image to template: ${error.message}`);
      return {
        success: false,
        templateHtml: '',
        templateCss: '',
        description: `Error: ${error.message}`,
        suggestedName: '',
        suggestedCategory: 'modern',
        colors: {
          primary: '#667eea',
          secondary: '#764ba2',
          accent: '#4299e1',
        },
      };
    }
  }

  async analyzeCVPicture(
    imageUrl: string,
    language: string = 'fr',
  ): Promise<{
    isSuitable: boolean;
    reason: string;
    suggestions: string[];
    personDescription?: string;
  }> {
    try {
      this.logger.log('Analyzing CV picture with OpenAI Vision...');

      const messages: any[] = [
        {
          role: 'system',
          content: `You are a professional CV consultant. Analyze CV pictures and determine if they are suitable for a professional CV. Be VERY STRICT about professional standards.

Criteria for a suitable CV photo:
- Professional appearance (formal or business casual attire)
- Clear, well-lit face photo
- Neutral or professional background
- Appropriate framing (headshot or upper body)
- No inappropriate content
- No group photos, selfies, or casual vacation photos
- Good image quality

CRITICAL POSTURE REQUIREMENTS (must be strictly enforced):
- NO hands touching face, chin, head, or hair
- NO casual poses (leaning, resting head, etc.)
- NO informal body language (crossed arms unless very professional, slouching, etc.)
- Person must be sitting or standing upright in a formal, professional manner
- Expression must be neutral-professional or confident, NOT casual or social media-like
- Posture must convey professionalism and confidence, not relaxation

REJECT if ANY of these are present:
- Hand(s) on face, chin, cheeks, or head
- Hand(s) in hair
- Casual or relaxed posture
- Social media-style poses
- Leaning casually
- Overly informal body language

Return a JSON response with:
{
  "isSuitable": boolean,
  "reason": "Brief explanation in ${language === 'fr' ? 'French' : language === 'es' ? 'Spanish' : 'English'}",
  "suggestions": ["Array of improvement suggestions in ${language === 'fr' ? 'French' : language === 'es' ? 'Spanish' : 'English'}"],
  "personDescription": "If NOT suitable, provide a detailed description of the person's physical appearance in English for generating a professional photo: gender, approximate age, ethnicity, skin tone, hair color and style, facial features, build. Be specific and respectful. This will be used to generate a professional CV photo that looks like the same person."
}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Is this image suitable for a professional CV?',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Using gpt-4o which supports vision
        messages,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      this.logger.log(`Image analysis result: ${JSON.stringify(result)}`);

      return {
        isSuitable: result.isSuitable || false,
        reason: result.reason || 'Unable to analyze image',
        suggestions: result.suggestions || [],
        personDescription: result.personDescription || undefined,
      };
    } catch (error) {
      this.logger.error(`Error analyzing profile picture: ${error.message}`);
      throw error;
    }
  }
}
