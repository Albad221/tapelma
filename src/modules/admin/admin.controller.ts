import { Controller, Get, Post, Put, Body, Logger } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CVConfigDto } from './dto/cv-config.dto';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Get('cv-config')
  getConfig(): CVConfigDto {
    this.logger.log('Fetching CV configuration');
    return this.adminService.getConfig();
  }

  @Put('cv-config')
  updateConfig(@Body() config: CVConfigDto): CVConfigDto {
    this.logger.log('Updating CV configuration via API');
    return this.adminService.updateConfig(config);
  }

  @Post('cv-config/reset')
  resetConfig(): CVConfigDto {
    this.logger.log('Resetting CV configuration to defaults');
    return this.adminService.resetToDefaults();
  }

  @Get('cv-config/mandatory-fields')
  getMandatoryFields(): { fields: string[] } {
    return {
      fields: this.adminService.getMandatoryFields(),
    };
  }

  @Get('cv-config/active-templates')
  getActiveTemplates() {
    return {
      templates: this.adminService.getActiveTemplates(),
    };
  }
}
