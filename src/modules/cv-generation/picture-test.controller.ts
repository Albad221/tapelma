import {
  Controller,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { OpenAIService } from '../openai/openai.service';
import { GeminiService } from '../gemini/gemini.service';

@Controller('picture-test')
export class PictureTestController {
  private readonly logger = new Logger(PictureTestController.name);

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly geminiService: GeminiService,
  ) {}

  @Post('analyze')
  async analyzePicture(@Body() body: { imageBase64: string; language?: string }) {
    try {
      const { imageBase64, language = 'fr' } = body;

      if (!imageBase64) {
        throw new HttpException('Image data is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log('Analyzing CV picture with OpenAI Vision...');

      // Convert base64 to data URL format if needed
      const imageUrl = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      // Analyze the image with OpenAI Vision
      const analysis = await this.openaiService.analyzeCVPicture(
        imageUrl,
        language,
      );

      this.logger.log(`Analysis result: ${JSON.stringify(analysis)}`);

      return {
        success: true,
        analysis,
      };
    } catch (error) {
      this.logger.error(`Error analyzing picture: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to analyze picture',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate')
  async generateProfessionalPicture(
    @Body() body: { description: string; language?: string },
  ) {
    try {
      const { description, language = 'fr' } = body;

      if (!description) {
        throw new HttpException(
          'Description is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(
        `Generating professional CV picture with description: ${description}`,
      );

      // Generate professional CV picture with Gemini
      const generatedImageBase64 =
        await this.geminiService.generateProfessionalCVPicture(
          description,
          language,
        );

      this.logger.log('Professional CV picture generated successfully');

      return {
        success: true,
        imageBase64: generatedImageBase64,
        message:
          language === 'fr'
            ? 'Photo professionnelle générée avec succès'
            : 'Professional picture generated successfully',
      };
    } catch (error) {
      this.logger.error(`Error generating picture: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to generate picture',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze-and-generate')
  async analyzeAndGenerate(
    @Body() body: { imageBase64: string; description?: string; language?: string },
  ) {
    try {
      const { imageBase64, description, language = 'fr' } = body;

      if (!imageBase64) {
        throw new HttpException('Image data is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log('Starting analysis and generation flow...');

      // Convert base64 to data URL format if needed
      const imageUrl = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      // Step 1: Analyze the uploaded image
      const analysis = await this.openaiService.analyzeCVPicture(
        imageUrl,
        language,
      );

      const result: any = {
        success: true,
        analysis,
        originalImage: imageBase64,
      };

      // Step 2: If image is not suitable, generate a professional one
      if (!analysis.isSuitable) {
        this.logger.log('Image not suitable, generating professional version...');

        try {
          const jobDescription = description || 'professional';
          const generatedImageBase64 =
            await this.geminiService.generateProfessionalCVPicture(
              `working as ${jobDescription}`,
              language,
              imageBase64, // Pass the original image for reference
            );

          result.generatedImage = generatedImageBase64;
          result.message =
            language === 'fr'
              ? 'Image analysée et photo professionnelle générée'
              : 'Image analyzed and professional photo generated';
        } catch (genError) {
          this.logger.warn(`Image generation failed: ${genError.message}`);
          result.message =
            language === 'fr'
              ? 'Image analysée mais génération de photo non disponible actuellement'
              : 'Image analyzed but photo generation not currently available';
        }
      } else {
        result.message =
          language === 'fr'
            ? 'Image validée pour utilisation CV'
            : 'Image approved for CV use';
      }

      return result;
    } catch (error) {
      this.logger.error(`Error in analyze-and-generate: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to process image',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
