import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY') || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.bucket = 'cv-documents'; // Supabase Storage bucket name
  }

  async uploadFile(
    file: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'cvs',
  ): Promise<{ key: string; url: string }> {
    try {
      // Generate unique file key
      const timestamp = Date.now();
      const hash = crypto.randomBytes(8).toString('hex');
      const key = `${folder}/${timestamp}-${hash}-${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(key, file, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL (valid for 7 days with signed URL)
      const { data: urlData } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(key, 7 * 24 * 60 * 60); // 7 days

      const url = urlData?.signedUrl || '';

      this.logger.log(`File uploaded successfully: ${key}`);
      return { key, url };
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`);
      throw error;
    }
  }

  async uploadFromUrl(
    fileUrl: string,
    fileName: string,
    folder: string = 'cvs',
  ): Promise<{ key: string; url: string }> {
    try {
      // Fetch file from URL
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const mimeType =
        response.headers.get('content-type') || 'application/octet-stream';

      return await this.uploadFile(buffer, fileName, mimeType, folder);
    } catch (error) {
      this.logger.error(`Error uploading file from URL: ${error.message}`);
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(key, expiresIn);

      if (error) {
        throw error;
      }

      return data?.signedUrl || '';
    } catch (error) {
      this.logger.error(`Error generating signed URL: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([key]);

      if (error) {
        throw error;
      }

      this.logger.log(`File deleted successfully: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`);
      return false;
    }
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .download(key);

      if (error) {
        throw error;
      }

      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error(`Error getting file buffer: ${error.message}`);
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    // Get public URL from Supabase Storage
    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(key);

    return data.publicUrl;
  }
}
