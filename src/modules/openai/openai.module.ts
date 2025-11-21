import { Module } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule {}
