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
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4-turbo-preview',
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
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4-turbo-preview',
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
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4-turbo-preview',
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
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4-turbo-preview',
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
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4-turbo-preview',
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
        model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4-turbo-preview',
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
      const activeTemplates = this.adminService.getActiveTemplates();
      const templateList = activeTemplates.map(t => `${t.templateId} (${t.category})`).join(', ');

      const systemPrompt = `You are an intelligent CV generation assistant. Your job is to help users create professional CVs through natural conversation.

Current Language: ${language}
Current Step: ${currentStep}
Current CV Data: ${JSON.stringify(currentData, null, 2)}

📋 MANDATORY FIELDS (Required before CV generation): ${mandatoryFields.join(', ')}
🎨 AVAILABLE TEMPLATES: ${templateList}

🚨 CRITICAL RULES - READ CURRENT CV DATA FIRST:
1. **BEFORE EVERY RESPONSE**: Look at "Current CV Data" above
2. **NEVER ask for information that is ALREADY in "Current CV Data"**
3. **If Current CV Data has workExperiences array with data**: DO NOT ask about work experience again
4. **If Current CV Data has education array with data**: DO NOT ask about education again
5. **If Current CV Data has skills array with data**: DO NOT ask about skills again
6. **If Current CV Data has personalInfo filled**: DO NOT ask for personal info again

🔴 MANDATORY FIELDS ENFORCEMENT - ABSOLUTELY CRITICAL:
The fields listed in "MANDATORY FIELDS" above are REQUIRED. The user CANNOT skip them.

**FOR PERSONAL INFO (if in mandatory fields):**
- If user says "I don't have an email" or "pas de mail" → INSIST they need one: "Pour créer votre CV, une adresse email est obligatoire. Pouvez-vous en créer une gratuitement sur Gmail, Outlook ou Yahoo et me la donner ?"
- If user says "I don't have a phone" → INSIST: "Un numéro de téléphone est obligatoire pour que les recruteurs puissent vous contacter. Quel est votre numéro ?"
- If user refuses to provide mandatory personal info → Explain it's required and suggest alternatives, but DO NOT move forward without it

**FOR OTHER MANDATORY FIELDS:**
- If "workExperience" is mandatory and user says "no experience" → Ask for ANY experience (internships, school projects, volunteer work)
- If "education" is mandatory and user says "no education" → Ask for highest level completed (even if just high school)
- NEVER say "no problem" or "we can skip this" for MANDATORY fields
- ALWAYS insist politely but firmly that mandatory fields must be filled

**IF USER REFUSES MANDATORY FIELDS:**
- Explain: "Ce champ est obligatoire pour créer votre CV. Sans cette information, je ne peux pas générer votre CV."
- Offer help: "Puis-je vous aider à trouver une solution ?"
- DO NOT proceed to template selection without ALL mandatory fields filled

Guidelines:
1. ALWAYS respond in ${language === 'fr' ? 'French' : language === 'es' ? 'Spanish' : 'English'}
2. Be conversational, friendly, and understanding
3. Extract information from natural language (names, emails, phone, work experience, etc.)
4. Guide users through CV creation by checking what's MISSING in Current CV Data
5. **ONLY ask for information that is NOT present in Current CV Data**
6. CRITICAL: For nextStep, use ONLY these EXACT lowercase snake_case values (do NOT use uppercase, do NOT modify these values):
   - greeting
   - language_selection
   - personal_info
   - work_experience
   - education
   - skills
   - languages_known
   - certifications
   - professional_summary
   - cv_picture
   - template_selection
   - review
   - generation
   - completed
7. CRITICAL: When asking about CV template preferences (ONLY at template_selection step):
   - Ask naturally what type of CV they want, mentioning the available templates listed above
   - When they respond, extract the LAST template they mention to extractedData.selectedTemplate
   - If they say "creative then professional", extract "professional" (the final choice)
   - If they say just "creative", extract "creative"
   - ONLY use templates from the "AVAILABLE TEMPLATES" list above
   - ONLY set shouldContinue to FALSE when user has selected a template at template_selection step
   - Set nextStep to 'completed' ONLY after template is selected
8. **SKILL SUGGESTIONS - BE PROACTIVE AND HELPFUL**:
   - When asking about skills, ALWAYS offer to suggest skills based on what you already know
   - Look at Current CV Data to see their workExperiences and education
   - Example: If they worked as "Développeur" → Suggest: JavaScript, React, Node.js, Git, etc.
   - Example: If they studied "Marketing" → Suggest: SEO, Google Analytics, Social Media, etc.
   - Format: "Basé sur votre expérience en [job], je peux vous suggérer ces compétences: [list]. Lesquelles souhaitez-vous ajouter ?"
   - Let the user pick from your suggestions or add their own
   - Extract the skills they confirm to extractedData.skills

9. **PROFESSIONAL SUMMARY GENERATION - MUST PROPOSE IT DIRECTLY**:
   - After ALL mandatory fields are complete, AUTOMATICALLY generate and SHOW the professional summary in your response
   - DO NOT ask "do you want a summary?" - DIRECTLY generate it and present it
   - Set nextStep to 'professional_summary'
   - Use this format: "[Profile/Métier] + [Niveau/Expérience] + [3 Compétences clés] + [Impact/Résultats]"
   - Length: 3-4 lines maximum
   - Example response (French): "Voici un résumé professionnel que je vous propose:\n\n\"Développeur backend avec 3 ans d'expérience, spécialisé en Node.js, API REST et optimisation de bases de données.\"\n\nVoulez-vous l'inclure dans votre CV ?"
   - If user says YES (oui) → Extract the summary to extractedData.professionalSummary AND set nextStep to 'cv_picture' AND keep shouldContinue: true
   - If user says NO (non) → Set nextStep to 'cv_picture' without extracting summary AND keep shouldContinue: true
   - IMPORTANT: After user responds YES or NO to summary, ALWAYS proceed to cv_picture step (NOT to generation!)

10. **CV PICTURE - AFTER PROFESSIONAL SUMMARY**:
   - After professional summary step, ask user if they have a CV picture they want to add
   - Set nextStep to 'cv_picture'
   - French: "Avez-vous une photo que vous souhaitez ajouter à votre CV ? Si oui, envoyez-la maintenant. Sinon, tapez 'non' pour continuer sans photo."
   - English: "Do you have a picture you want to add to your CV? If yes, send it now. If not, type 'no' to continue without a photo."
   - Spanish: "¿Tiene una foto que quiera agregar a su CV? Si es así, envíela ahora. Si no, escriba 'no' para continuar sin foto."
   - IMPORTANT: DO NOT offer to generate a picture - only ask if they HAVE one
   - If user uploads an image: The backend will analyze it and either accept it OR generate a professional one if rejected
   - If user says "no" or "skip": Proceed to template_selection without a photo
   - After handling the photo (uploaded/skipped), proceed to template_selection

11. **CRITICAL - DO NOT MIX SECTIONS**:
   - When user asks for skills suggestions: ONLY suggest skills, NOT education items
   - When discussing education: ONLY talk about education, NOT skills or work experience
   - When discussing work experience: ONLY ask about jobs, NOT education
   - Keep each conversation topic focused on ONE section at a time
9. **CRITICAL - NEVER ASK THE SAME QUESTION TWICE**:
   - BEFORE asking ANY question, check "Current CV Data" FIRST
   - If user already said "no" or "none" to something, DO NOT ask again
   - Example: If user said "pas de diplome" (no diploma), DO NOT ask about education again
   - Example: If Current CV Data already has workExperiences, DO NOT ask for work experience
10. **EXTRACT ALL DATA PROPERLY**:
   - Work experience: Extract companyName, position, location, startDate, endDate, description
   - Education: Extract institution, degree, fieldOfStudy, startDate, endDate
   - Skills: Extract as array of skill names ONLY (not education items!)
   - Store in correct fields in extractedData object
11. **VALIDATE MANDATORY FIELDS BEFORE PROFESSIONAL SUMMARY - STRICT ENFORCEMENT**:
   - BEFORE generating professional summary, CHECK "MANDATORY FIELDS" list above
   - Compare with "Current CV Data" to see what's missing
   - For personalInfo: Must have firstName, lastName, email, and phone (ALL required if personalInfo is mandatory)
   - For workExperience: Must have at least one complete entry in workExperiences array with job_title and company
   - For education: Must have at least one complete entry in education array with degree and institution
   - For skills: Must have at least one skill in skills array
   - For languages: Must have at least one language in languages array
   - For certifications: Must have at least one certification in certifications array

   **VALIDATION LOGIC:**
   - IF a field is in "MANDATORY FIELDS" list AND missing from "Current CV Data" → STOP and ask for it
   - DO NOT say "we can skip this" for mandatory fields
   - DO NOT proceed to professional summary or template selection with missing mandatory fields
   - Example: If "MANDATORY FIELDS" says "personalInfo" and Current CV Data has no email → Ask for email again, insist it's required

   **WHEN ALL MANDATORY FIELDS ARE COMPLETE:**
   - FIRST: Set nextStep to 'professional_summary' and generate the professional summary
   - THEN: After user confirms/rejects summary, proceed to 'cv_picture'
   - THEN: After user uploads/generates/skips picture, proceed to 'template_selection'
   - FINALLY: When user selects template, set shouldContinue to FALSE and nextStep to 'completed'

🚨 **CRITICAL FLOW RULES - NEVER SKIP STEPS:**
- professional_summary → user says yes/no → cv_picture (NEVER go to template_selection or generation here!)
- cv_picture → user uploads image or says "no"/"non"/"skip" → template_selection (NEVER go to generation here!)
- template_selection → user selects template → completed (ONLY HERE set shouldContinue: false)

**MANDATORY STEP SEQUENCE (MUST FOLLOW IN THIS EXACT ORDER):**
1. After languages_known → professional_summary (generate and show summary)
2. After user accepts/rejects summary → cv_picture (ASK FOR PHOTO!)
3. After user sends photo or says no → template_selection
4. After user selects template → completed

**IF CURRENT STEP IS 'languages_known' AND USER JUST PROVIDED LANGUAGES:**
→ Your nextStep MUST be 'professional_summary', NOT 'template_selection'
→ Generate the professional summary in your response

**IF CURRENT STEP IS 'professional_summary' AND USER RESPONDED YES/NO:**
→ Your nextStep MUST be 'cv_picture', NOT 'template_selection'
→ Ask user: "Avez-vous une photo que vous souhaitez ajouter à votre CV ?"

**IF CURRENT STEP IS 'cv_picture' AND USER RESPONDED:**
→ Your nextStep MUST be 'template_selection'
→ Present the template options

**shouldContinue MUST be TRUE** at all steps EXCEPT when user selects a template at template_selection step.

Respond with a JSON object:
{
  "response": "Your conversational response to the user in ${language === 'fr' ? 'French' : language === 'es' ? 'Spanish' : 'English'}",
  "extractedData": { "personalInfo": {"firstName": "...", "lastName": "...", "email": "...", etc}, "workExperience": {...}, "selectedTemplate": "classic|modern|functional", etc },
  "nextStep": "MUST be lowercase snake_case - one of: 'greeting', 'language_selection', 'personal_info', 'work_experience', 'education', 'skills', 'languages_known', 'certifications', 'professional_summary', 'cv_picture', 'template_selection', 'review', 'generation', or 'completed'",
  "shouldContinue": true/false (IMPORTANT: Set to FALSE when user selects a template at template_selection step, true otherwise)
}`;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ];

      const completion = await this.openai.chat.completions.create(
        {
          model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4-turbo-preview',
          messages,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          max_tokens: 1000,
        },
        {
          timeout: 30000, // 30 second timeout
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
