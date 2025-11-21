import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CanvaService } from './canva.service';

@Module({
  imports: [HttpModule],
  providers: [CanvaService],
  exports: [CanvaService],
})
export class CanvaModule {}
