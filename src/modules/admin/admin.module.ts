import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EnhancedAdminController } from './enhanced-admin.controller';
import { EnhancedAdminService } from './enhanced-admin.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [AdminController, EnhancedAdminController],
  providers: [AdminService, EnhancedAdminService],
  exports: [AdminService, EnhancedAdminService],
})
export class AdminModule {}
