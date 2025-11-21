import { Controller, Get, Post, Put, Delete, Body, Param, Logger } from '@nestjs/common';
import { EnhancedAdminService } from './enhanced-admin.service';
import { EnhancedCVConfigDto, EnhancedFieldConfig } from './dto/enhanced-cv-config.dto';

@Controller('admin/enhanced')
export class EnhancedAdminController {
  private readonly logger = new Logger(EnhancedAdminController.name);

  constructor(private readonly enhancedAdminService: EnhancedAdminService) {}

  @Get('cv-config')
  getConfig(): EnhancedCVConfigDto {
    this.logger.log('Fetching enhanced CV configuration');
    return this.enhancedAdminService.getConfig();
  }

  @Put('cv-config')
  updateConfig(@Body() config: EnhancedCVConfigDto): EnhancedCVConfigDto {
    this.logger.log('Updating enhanced CV configuration');
    return this.enhancedAdminService.updateConfig(config);
  }

  @Post('cv-config/reset')
  resetConfig(): EnhancedCVConfigDto {
    this.logger.log('Resetting enhanced CV configuration to defaults');
    return this.enhancedAdminService.resetToDefaults();
  }

  @Get('categories')
  getCategories() {
    return {
      categories: this.enhancedAdminService.getCategories(),
    };
  }

  @Get('categories/:categoryId/fields')
  getFieldsByCategory(@Param('categoryId') categoryId: string) {
    return {
      fields: this.enhancedAdminService.getFieldsByCategory(categoryId),
    };
  }

  @Get('mandatory-fields')
  getMandatoryFields() {
    return {
      fields: this.enhancedAdminService.getMandatoryFields(),
    };
  }

  @Post('fields')
  addField(@Body() field: EnhancedFieldConfig): EnhancedCVConfigDto {
    this.logger.log(`Adding new field: ${field.fieldName}`);
    return this.enhancedAdminService.addField(field);
  }

  @Put('fields/:fieldName')
  updateField(
    @Param('fieldName') fieldName: string,
    @Body() updates: Partial<EnhancedFieldConfig>,
  ): EnhancedCVConfigDto {
    this.logger.log(`Updating field: ${fieldName}`);
    return this.enhancedAdminService.updateField(fieldName, updates);
  }

  @Delete('fields/:fieldName')
  deleteField(@Param('fieldName') fieldName: string): EnhancedCVConfigDto {
    this.logger.log(`Deleting field: ${fieldName}`);
    return this.enhancedAdminService.deleteField(fieldName);
  }
}
