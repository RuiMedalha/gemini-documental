import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { AppService, ProcessDocumentDto } from './app.service';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return { status: 'healthy', version: '3.0.0', engine: 'DocFlow Suite Empresarial' };
  }

  @Get('settings')
  getSettings() {
    return this.appService.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() body: any) {
    return this.appService.updateSettings(body);
  }

  @Post('documents/process-hybrid')
  processHybrid(@Body() body: ProcessDocumentDto) {
    return this.appService.processDocumentHybrid(body);
  }

  @Get('documents')
  getAllDocuments() {
    return this.appService.getDocuments();
  }

  @Post('documents')
  createDocument(@Body() data: any) {
    return this.appService.saveDocument(data);
  }

  @Put('documents/:id/payment')
  updatePayment(@Param('id') id: string, @Body() data: any) {
    return this.appService.updatePaymentStatus(id, data);
  }

  @Get('folders')
  getFolders() {
    return this.appService.getFolders();
  }

  @Post('folders')
  createFolder(@Body() data: any) {
    return this.appService.createFolder(data);
  }
}
