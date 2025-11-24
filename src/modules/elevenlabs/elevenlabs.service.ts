import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private client: ElevenLabsClient;
  private readonly voiceId: string;
  private readonly modelId: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ELEVENLABS_API_KEY');

    if (!apiKey) {
      this.logger.warn('ElevenLabs API key not configured - audio features will be disabled');
    } else {
      this.client = new ElevenLabsClient({ apiKey });
      this.logger.log('ElevenLabs client initialized');
    }

    // Default voice: "Rachel" - a warm, friendly female voice good for conversational AI
    // Other popular voices:
    // - 21m00Tcm4TlvDq8ikWAM = Rachel (warm female)
    // - EXAVITQu4vr4xnSDxMaL = Bella (soft female)
    // - ErXwobaYiN019PkySvjV = Antoni (friendly male)
    // - VR6AewLTigWG4xSOukaG = Arnold (deep male)
    // - pNInz6obpgDQGcFmaJgB = Adam (deep male, American)
    // - yoZ06aMxZJJ28mfd3POQ = Sam (young male)
    this.voiceId = '21m00Tcm4TlvDq8ikWAM';

    // Model: eleven_multilingual_v2 supports 29 languages including French, English, Spanish
    // Other models:
    // - eleven_monolingual_v1 = English only, faster
    // - eleven_multilingual_v1 = Older multilingual
    // - eleven_multilingual_v2 = Best quality multilingual (recommended)
    // - eleven_turbo_v2 = Faster, slightly lower quality
    this.modelId = 'eleven_multilingual_v2';
  }

  /**
   * Transcribe audio using ElevenLabs Speech-to-Text (ASR)
   * @param audioBuffer - Audio file buffer (supports WAV, MP3, OGG, etc.)
   * @param languageCode - Optional language code (e.g., 'en', 'fr', 'es')
   * @returns Transcribed text
   */
  async transcribeAudio(audioBuffer: Buffer, languageCode?: string): Promise<string> {
    if (!this.client) {
      throw new Error('ElevenLabs client not initialized - missing API key');
    }

    try {
      this.logger.log(`Transcribing audio (${audioBuffer.length} bytes)${languageCode ? ` in ${languageCode}` : ''}`);

      // Create a temporary file for the audio
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `audio_${Date.now()}.ogg`);
      fs.writeFileSync(tempFilePath, audioBuffer);

      try {
        // Use ElevenLabs Speech-to-Text API
        const response = await this.client.speechToText.convert({
          file: fs.createReadStream(tempFilePath),
          modelId: 'scribe_v1', // ElevenLabs ASR model
          languageCode: languageCode,
        });

        // Response can be SpeechToTextChunkResponseModel or MultichannelSpeechToTextResponseModel
        // We need to handle both cases
        const transcription = response as any;
        const text = transcription.text || '';

        this.logger.log(`Transcription successful: "${text.substring(0, 50)}..."`);
        return text;
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to transcribe audio: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Convert text to speech using ElevenLabs TTS
   * @param text - Text to convert to speech
   * @param voiceId - Optional voice ID (defaults to configured voice)
   * @returns Audio buffer (MP3 format)
   */
  async textToSpeech(text: string, voiceId?: string): Promise<Buffer> {
    if (!this.client) {
      throw new Error('ElevenLabs client not initialized - missing API key');
    }

    try {
      this.logger.log(`Converting text to speech: "${text.substring(0, 50)}..."`);

      const audioStream = await this.client.textToSpeech.convert(
        voiceId || this.voiceId,
        {
          text,
          modelId: this.modelId,
          outputFormat: 'mp3_44100_128',
        }
      );

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }
      const audioBuffer = Buffer.concat(chunks);

      this.logger.log(`TTS conversion successful (${audioBuffer.length} bytes)`);
      return audioBuffer;
    } catch (error) {
      this.logger.error(`Failed to convert text to speech: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Convert text to speech and save to a temporary file
   * @param text - Text to convert
   * @param voiceId - Optional voice ID
   * @returns Path to the temporary audio file
   */
  async textToSpeechFile(text: string, voiceId?: string): Promise<string> {
    const audioBuffer = await this.textToSpeech(text, voiceId);

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `tts_${Date.now()}.mp3`);
    fs.writeFileSync(tempFilePath, audioBuffer);

    return tempFilePath;
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices(): Promise<any[]> {
    if (!this.client) {
      throw new Error('ElevenLabs client not initialized - missing API key');
    }

    try {
      const response = await this.client.voices.getAll();
      return response.voices || [];
    } catch (error) {
      this.logger.error(`Failed to get voices: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if ElevenLabs is properly configured
   */
  isConfigured(): boolean {
    return !!this.client;
  }

  /**
   * Map session language to ElevenLabs language code
   */
  mapLanguageCode(sessionLanguage: string): string {
    const languageMap: Record<string, string> = {
      'en': 'en',
      'fr': 'fr',
      'es': 'es',
      'de': 'de',
      'it': 'it',
      'pt': 'pt',
      'nl': 'nl',
      'pl': 'pl',
      'ru': 'ru',
      'ja': 'ja',
      'ko': 'ko',
      'zh': 'zh',
      'ar': 'ar',
      'hi': 'hi',
    };

    return languageMap[sessionLanguage?.toLowerCase()] || 'en';
  }
}
