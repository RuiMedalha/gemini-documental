import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return { status: 'healthy', version: '4.5.0', engine: 'DocFlow SNC & TOConline Connector' };
  }

  // SNC & TOConline
  @Get('snc')
  getSncTable() {
    return this.appService.getSncTable();
  }

  @Post('toconline/test')
  testTocOnline() {
    return this.appService.testTocOnlineConnection();
  }

  // Fornecedores & Regras
  @Get('suppliers')
  getSuppliers() {
    return this.appService.getSuppliers();
  }

  @Post('suppliers')
  createSupplier(@Body() body: any) {
    return this.appService.createSupplier(body);
  }

  @Delete('suppliers/:id')
  deleteSupplier(@Param('id') id: string) {
    return this.appService.deleteSupplier(id);
  }

  // Pastas
  @Get('folders')
  getFolders() {
    return this.appService.getFolders();
  }

  @Post('folders')
  createFolder(@Body() data: any) {
    return this.appService.createFolder(data);
  }

  // Documentos
  @Post('documents/process-hybrid')
  processHybrid(@Body() body: any) {
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

  @Get('settings')
  getSettings() {
    return this.appService.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() body: any) {
    return this.appService.updateSettings(body);
  }
}
