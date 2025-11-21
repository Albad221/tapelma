import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  User,
  ConversationSession,
  CVData,
  ConversationStep,
  SessionStatus,
  WorkExperience,
  Education,
  Skill,
  Certification,
} from '../../common/interfaces/cv-data.interface';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY') || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async findOrCreateUser(phoneNumber: string): Promise<User> {
    try {
      // Try to find existing user
      const { data: existingUser, error: findError } = await this.supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (existingUser) {
        return this.mapToUser(existingUser);
      }

      // Create new user
      const { data: newUser, error: createError } = await this.supabase
        .from('users')
        .insert([
          {
            phone_number: phoneNumber,
            preferred_language: 'fr',
          },
        ])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      this.logger.log(`New user created: ${phoneNumber}`);
      return this.mapToUser(newUser);
    } catch (error) {
      this.logger.error(`Error finding/creating user: ${error.message}`);
      throw error;
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          email: updates.email,
          preferred_language: updates.preferredLanguage,
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToUser(data);
    } catch (error) {
      this.logger.error(`Error updating user: ${error.message}`);
      throw error;
    }
  }

  async getActiveSession(userId: string): Promise<ConversationSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', SessionStatus.ACTIVE)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found"
        throw error;
      }

      return data ? this.mapToSession(data) : null;
    } catch (error) {
      this.logger.error(`Error getting active session: ${error.message}`);
      return null;
    }
  }

  async createSession(
    userId: string,
    language: string = 'fr',
  ): Promise<ConversationSession> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .insert([
          {
            user_id: userId,
            status: SessionStatus.ACTIVE,
            current_step: ConversationStep.GREETING,
            language,
            data: {},
          },
        ])
        .select()
        .single();

      if (error) throw error;

      this.logger.log(`New session created for user: ${userId}`);
      return this.mapToSession(data);
    } catch (error) {
      this.logger.error(`Error creating session: ${error.message}`);
      throw error;
    }
  }

  async updateSession(
    sessionId: string,
    updates: {
      currentStep?: ConversationStep;
      status?: SessionStatus;
      data?: CVData;
    },
  ): Promise<ConversationSession> {
    try {
      const updateData: any = {
        last_interaction: new Date().toISOString(),
      };

      if (updates.currentStep) {
        updateData.current_step = updates.currentStep;
      }
      if (updates.status) {
        updateData.status = updates.status;
      }
      if (updates.data) {
        updateData.data = updates.data;
      }

      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToSession(data);
    } catch (error) {
      this.logger.error(`Error updating session: ${error.message}`);
      throw error;
    }
  }

  async saveWorkExperience(
    sessionId: string,
    workExp: WorkExperience,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('work_experiences').insert([
        {
          session_id: sessionId,
          company_name: workExp.companyName,
          position: workExp.position,
          location: workExp.location,
          start_date: workExp.startDate,
          end_date: workExp.endDate,
          is_current: workExp.isCurrent,
          description: workExp.description,
          optimized_description: workExp.optimizedDescription,
        },
      ]);

      if (error) throw error;
    } catch (error) {
      this.logger.error(`Error saving work experience: ${error.message}`);
      throw error;
    }
  }

  async saveEducation(sessionId: string, education: Education): Promise<void> {
    try {
      const { error } = await this.supabase.from('education').insert([
        {
          session_id: sessionId,
          institution: education.institution,
          degree: education.degree,
          field_of_study: education.fieldOfStudy,
          location: education.location,
          start_date: education.startDate,
          end_date: education.endDate,
          is_current: education.isCurrent,
          gpa: education.gpa,
          description: education.description,
        },
      ]);

      if (error) throw error;
    } catch (error) {
      this.logger.error(`Error saving education: ${error.message}`);
      throw error;
    }
  }

  async saveSkills(sessionId: string, skills: Skill[]): Promise<void> {
    try {
      const skillsData = skills.map((skill) => ({
        session_id: sessionId,
        name: skill.name,
        category: skill.category,
        proficiency: skill.proficiency,
      }));

      const { error } = await this.supabase.from('skills').insert(skillsData);

      if (error) throw error;
    } catch (error) {
      this.logger.error(`Error saving skills: ${error.message}`);
      throw error;
    }
  }

  async saveCertifications(
    sessionId: string,
    certifications: Certification[],
  ): Promise<void> {
    try {
      const certsData = certifications.map((cert) => ({
        session_id: sessionId,
        name: cert.name,
        issuing_organization: cert.issuingOrganization,
        issue_date: cert.issueDate,
        expiry_date: cert.expiryDate,
        credential_id: cert.credentialId,
        credential_url: cert.credentialUrl,
      }));

      const { error } = await this.supabase
        .from('certifications')
        .insert(certsData);

      if (error) throw error;
    } catch (error) {
      this.logger.error(`Error saving certifications: ${error.message}`);
      throw error;
    }
  }

  async saveGeneratedDocument(documentData: {
    userId: string;
    sessionId: string;
    documentType: 'cv' | 'cover_letter';
    templateId?: string;
    fileUrl?: string;
    s3Key?: string;
    fileFormat: 'pdf' | 'docx';
    atsScore?: number;
    atsSuggestions?: any;
    status: 'generating' | 'completed' | 'failed';
  }): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('generated_documents')
        .insert([
          {
            user_id: documentData.userId,
            session_id: documentData.sessionId,
            document_type: documentData.documentType,
            template_id: documentData.templateId,
            file_url: documentData.fileUrl,
            s3_key: documentData.s3Key,
            file_format: documentData.fileFormat,
            ats_score: documentData.atsScore,
            ats_suggestions: documentData.atsSuggestions,
            status: documentData.status,
          },
        ])
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      this.logger.error(`Error saving generated document: ${error.message}`);
      throw error;
    }
  }

  async logMessage(messageData: {
    userId?: string;
    sessionId?: string;
    direction: 'inbound' | 'outbound';
    messageType: string;
    content: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.supabase.from('message_logs').insert([
        {
          user_id: messageData.userId,
          session_id: messageData.sessionId,
          direction: messageData.direction,
          message_type: messageData.messageType,
          content: messageData.content,
          metadata: messageData.metadata || {},
        },
      ]);
    } catch (error) {
      // Don't throw on logging errors
      this.logger.error(`Error logging message: ${error.message}`);
    }
  }

  private mapToUser(data: any): User {
    return {
      id: data.id,
      phoneNumber: data.phone_number,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      preferredLanguage: data.preferred_language || 'en',
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapToSession(data: any): ConversationSession {
    return {
      id: data.id,
      userId: data.user_id,
      status: data.status,
      currentStep: data.current_step,
      language: data.language,
      data: data.data || {},
      lastInteraction: new Date(data.last_interaction),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  async getRecentMessages(userId: string, limit: number = 20): Promise<Array<{
    direction: 'inbound' | 'outbound';
    content: string;
    createdAt: Date;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('message_logs')
        .select('direction, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(msg => ({
        direction: msg.direction,
        content: msg.content,
        createdAt: new Date(msg.created_at),
      }));
    } catch (error) {
      this.logger.error(`Error getting recent messages: ${error.message}`);
      return [];
    }
  }

  /**
   * Reset user's conversation - clear all sessions and message history
   * This allows starting fresh without old context affecting the conversation
   */
  async resetUserConversation(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by phone number
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();

      if (userError || !user) {
        return { success: false, message: 'User not found' };
      }

      const userId = user.id;

      // Delete all message logs for this user
      const { error: messagesError } = await this.supabase
        .from('message_logs')
        .delete()
        .eq('user_id', userId);

      if (messagesError) {
        this.logger.error(`Error deleting message logs: ${messagesError.message}`);
      }

      // Update all sessions to cancelled status
      const { error: sessionsError } = await this.supabase
        .from('conversation_sessions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (sessionsError) {
        this.logger.error(`Error updating sessions: ${sessionsError.message}`);
      }

      this.logger.log(`Reset conversation for user: ${phoneNumber}`);
      return { success: true, message: 'Conversation history cleared successfully' };
    } catch (error) {
      this.logger.error(`Error resetting user conversation: ${error.message}`);
      return { success: false, message: error.message };
    }
  }
}
